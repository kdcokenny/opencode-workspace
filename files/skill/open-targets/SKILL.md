> WARNING Build agent - delegation required: The opentargets_* tools are only available to the researcher agent. Always delegate Open Targets queries via task(subagent_type: "researcher").

---
name: open-targets
description: Open Targets Platform MCP tools - use for target-disease associations, drug-target queries, and genetic evidence via the Open Targets MCP server
---

# Open Targets Platform MCP Integration

**Rule:** For ALL Open Targets queries (targets, diseases, drugs, genetic evidence, variants, pathways), use the Open Targets MCP server tools.

## What is Open Targets?

The [Open Targets Platform](https://platform.opentargets.org/) is a comprehensive resource for systematic identification and prioritisation of drug targets. It integrates public domain data from genetics, genomics, transcriptomics, drugs, animal models, and scientific literature to score and rank target-disease associations. The Platform GraphQL API provides programmatic access to all of this data.

## Core Principles

1. **MCP tools are available** - The Open Targets MCP server (`opentargets`) provides direct, structured access to the Platform GraphQL API
2. **Follow the 3-step workflow** - (1) Resolve identifiers, (2) Learn schema, (3) Execute query
3. **Always resolve identifiers first** - The API requires standardized IDs (Ensembl, EFO/MONDO, ChEMBL), not human-readable names
4. **Use jq filters** - The server runs with `--jq` enabled; always include `jq_filter` to reduce token consumption
5. **Prefer this over raw REST** - Use these MCP tools instead of `curl`/`database-lookup` for Open Targets queries

## Available Tools

| Tool | Description |
|------|-------------|
| `opentargets_search_entities` | Search for entities across multiple types (targets, diseases, drugs, variants, studies) and resolve human-readable names to standardized IDs. Supports multiple query strings in a single call. |
| `opentargets_get_open_targets_graphql_schema` | Fetch category-based subschemas from the Platform GraphQL API. Returns SDL for relevant types/fields filtered by category. Use to learn query structure before executing queries. |
| `opentargets_get_type_dependencies` | Explore schema type relationships by fetching the exact GraphQL SDL subset for specified types and all their recursively reachable dependencies. Fallback when category-based schema is insufficient. |
| `opentargets_query_open_targets_graphql` | Execute a single GraphQL query against the Platform API. Supports variables and server-side jq filtering. |
| `opentargets_batch_query_open_targets_graphql` | Execute the same GraphQL query multiple times with different variable sets. Use when querying multiple targets, diseases, or drugs with the same query structure. |

## Required Identifier Formats

The API requires standardized identifiers, not human-readable names:

| Entity | Format | Example |
|--------|--------|---------|
| Targets/Genes | Ensembl Gene ID | `ENSG00000139618` (BRCA2) |
| Diseases | EFO or MONDO ID | `EFO_0000305` (breast carcinoma), `MONDO_0007254` (breast cancer) |
| Drugs | ChEMBL ID | `CHEMBL25` (aspirin), `CHEMBL1201583` (trastuzumab) |
| Variants | chr_pos_ref_alt or rsID | `19_44908822_C_T`, `rs7412` |
| Studies | Study ID | `GCST90002357` |
| Credible Sets | Study Locus ID | `7d68cc9c70351c9dbd2a2c0c145e555d` |

## Schema Categories

When calling `opentargets_get_open_targets_graphql_schema`, specify one or more of these categories:

| Category | Description |
|----------|-------------|
| `disease-associations` | Target-disease association evidence and target prioritisation across data types |
| `genetic-associations` | GWAS, molecular QTL associations, fine-mapping, credible sets, locus-to-gene |
| `drug-indications` | Approved/investigational indications, clinical trial phases, drug repurposing |
| `drug-mechanisms` | Drug mechanisms of action, target interactions from ChEMBL, polypharmacology |
| `drug-safety` | Post-market pharmacovigilance from FDA FAERS, adverse events, drug warnings |
| `pharmacogenomics` | Genetic variation affecting drug response, gene-drug interactions |
| `clinical-genetics` | ClinGen, ClinVar, Genomics England PanelApp, Orphanet, Gene2Phenotype |
| `cancer-genomics` | Cancer Gene Census, IntOGen, cancer biomarkers, cancer hallmarks, driver genes |
| `functional-genomics` | Gene expression, biological pathways, Reactome, Gene Ontology |
| `molecular-interactions` | Protein-protein interactions and molecular networks |
| `experimental-models` | CRISPR screens, mouse phenotypes (IMPC), DepMap, chemical probes |
| `variant-annotation` | Variant effect predictions (VEP), population genetics, functional consequences |
| `genetic-constraint` | Loss-of-function intolerance and selection pressure metrics |
| `target-safety` | Target safety liabilities, toxicity predictions, clinical safety flags |
| `target-tractability` | Druggability assessments, small molecule and antibody tractability |
| `protein-information` | Protein abundances and subcellular localization |
| `comparative-genomics` | Cross-species orthology and evolutionary conservation |
| `literature-evidence` | Text-mined evidence, disease/drug bibliographies, citation networks |
| `disease-phenotypes` | Disease phenotypes, symptoms, HPO terms, ontology relationships |
| `entity-search` | Cross-entity search and discovery (targets, diseases, drugs, variants, studies) |
| `platform-metadata` | Platform version info, data release, downloadable dataset metadata |

## 3-Step Workflow

### Step 1: Resolve Identifiers

Convert human-readable names to standardized IDs:

```
opentargets_search_entities(query_strings=["BRCA2", "breast cancer", "trastuzumab"])

Result:
{
  "BRCA2": [{"id": "ENSG00000139618", "entity": "target"}],
  "breast cancer": [{"id": "MONDO_0007254", "entity": "disease"}],
  "trastuzumab": [{"id": "CHEMBL1201585", "entity": "drug"}]
}
```

### Step 2: Learn Query Structure

Fetch the schema subset for the data domain you need:

```
opentargets_get_open_targets_graphql_schema(categories=["drug-mechanisms", "drug-safety"])
```

Be INCLUSIVE with categories - it is better to include extra categories than to miss required types.

For deeper type exploration (fallback only):

```
opentargets_get_type_dependencies(type_names=["Target", "Drug"])
```

### Step 3: Execute Query

Build and execute the GraphQL query with a jq filter:

```
opentargets_query_open_targets_graphql(
  query_string='query TargetInfo($ensemblId: String!) { target(ensemblId: $ensemblId) { id approvedSymbol approvedName biotype } }',
  variables={"ensemblId": "ENSG00000139618"},
  jq_filter='.data.target | {id, symbol: .approvedSymbol, name: .approvedName}'
)
```

For batch queries (same query, multiple entities):

```
opentargets_batch_query_open_targets_graphql(
  query_string='query DrugInfo($chemblId: String!) { drug(chemblId: $chemblId) { id name maximumClinicalTrialPhase } }',
  variables_list=[{"chemblId": "CHEMBL25"}, {"chemblId": "CHEMBL521"}],
  key_field="chemblId",
  jq_filter='.data.drug | {name, phase: .maximumClinicalTrialPhase}'
)
```

## Common Operations

### Get Target-Disease Associations
```
1. search_entities(["BRAF", "melanoma"]) -> resolve IDs
2. get_open_targets_graphql_schema(["disease-associations"]) -> learn structure
3. query_open_targets_graphql(query with target + disease IDs, jq_filter for scores)
```

### Find Drugs for a Target
```
1. search_entities(["EGFR"]) -> resolve target ID
2. get_open_targets_graphql_schema(["drug-indications", "drug-mechanisms"]) -> learn structure
3. query_open_targets_graphql(query knownDrugs for target, jq_filter for drug names + phases)
```

### Explore Genetic Evidence for a Disease
```
1. search_entities(["Alzheimer's disease"]) -> resolve disease ID
2. get_open_targets_graphql_schema(["genetic-associations"]) -> learn structure
3. query_open_targets_graphql(query associatedTargets with genetic evidence, jq_filter)
```

### Check Drug Safety Profile
```
1. search_entities(["ibuprofen"]) -> resolve drug ID
2. get_open_targets_graphql_schema(["drug-safety"]) -> learn structure
3. query_open_targets_graphql(query adverseEvents for drug, jq_filter for event details)
```

### Batch Query Multiple Genes
```
1. search_entities(["BRCA1", "BRCA2", "TP53"]) -> resolve all IDs
2. get_open_targets_graphql_schema(["target-tractability"]) -> learn structure
3. batch_query_open_targets_graphql(tractability query, variables_list with all IDs, key_field="ensemblId")
```

## DO THIS / NOT THIS

### Querying Open Targets Data
```
# DO THIS - use the MCP tools with the 3-step workflow
opentargets_search_entities(query_strings=["BRCA1"])
opentargets_get_open_targets_graphql_schema(categories=["disease-associations"])
opentargets_query_open_targets_graphql(query_string=..., variables=..., jq_filter=...)

# NOT THIS - raw REST API calls
curl https://api.platform.opentargets.org/api/v4/graphql -d '{"query": "..."}'
```

### Resolving Gene Names to IDs
```
# DO THIS - use search_entities
opentargets_search_entities(query_strings=["BRCA2"])

# NOT THIS - hard-coding IDs or guessing Ensembl IDs
variables={"ensemblId": "ENSG00000139618"}  # without resolving first
```

### Querying Multiple Entities
```
# DO THIS - use batch query
opentargets_batch_query_open_targets_graphql(
  query_string=..., variables_list=[...], key_field="ensemblId"
)

# NOT THIS - multiple individual queries in a loop
for gene in genes:
    opentargets_query_open_targets_graphql(...)
```

### Reducing Response Size
```
# DO THIS - always include jq_filter (server has --jq enabled)
opentargets_query_open_targets_graphql(..., jq_filter='.data.target | {id, symbol: .approvedSymbol}')

# NOT THIS - returning full unfiltered API responses
opentargets_query_open_targets_graphql(...) # no jq_filter, wastes tokens
```

## When to Use This vs database-lookup Skill

| Use Open Targets MCP (`opentargets_*`) | Use `database-lookup` skill |
|----------------------------------------|----------------------------|
| Target-disease association scores | Quick Open Targets REST lookups without GraphQL |
| Complex GraphQL queries with joins | Other databases (UniProt, PubChem, KEGG, etc.) |
| Batch queries across entities | Multi-database cross-referencing |
| Drug mechanism + safety combined | When MCP server is unavailable |
| Schema-guided query construction | Simple ID-based lookups |
| jq-filtered precise data extraction | Databases not in Open Targets |

**Rule of thumb:** If querying Open Targets Platform data, always prefer these MCP tools. They provide schema-guided query construction, batch processing, and server-side filtering that raw REST calls cannot match.

## Troubleshooting

### "Invalid category name" Error
- Check the category name against the list above; names are case-sensitive and hyphenated
- Use `get_open_targets_graphql_schema` with a valid category to see available types

### "Type not found in schema" Error
- The `get_type_dependencies` tool will suggest similar type names
- Type names are PascalCase (e.g., `Target`, `Disease`, `KnownDrug`)

### Empty or Unexpected Results
- Verify IDs were resolved correctly via `search_entities` first
- Check that variables match the query parameter names exactly
- Ensure the jq filter path matches the actual response structure (e.g., `.data.target` not `.target`)

### Query Syntax Errors
- GraphQL queries must start with the `query` keyword
- Always declare variables in the query signature: `query MyQuery($var: Type!)`
- Use the schema output's "COMMON MISTAKES TO AVOID" guidance

### Tool Not Found
- Ensure the `opentargets` MCP server is configured in opencode.jsonc
- All tools are prefixed with `opentargets_` (e.g., `opentargets_search_entities`)
- Restart OpenCode after config changes
