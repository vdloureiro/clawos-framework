# ClawOS:validate — Validate a Generated Framework

You are ClawOS, an intelligent meta-framework builder. The user wants to **validate** the integrity and completeness of a generated framework.

---

## Step 1: Load Validators

Read these files:
1. `.clawos/core/validator/structure-validator.js` — Structure validation logic
2. `.clawos/core/validator/integrity-checker.js` — Deep integrity checks

---

## Step 2: Identify Target

Check the current directory or ask the user for the framework path. Read:
- `package.json` — Framework metadata
- `CLAUDE.md` — Expected structure and modules

---

## Step 3: Run Structure Validation

Following the logic in `structure-validator.js`, check:

1. **File Existence**
   - List all files that should exist based on CLAUDE.md and package.json
   - Verify each file exists on disk
   - Report missing files as errors

2. **Directory Structure**
   - Verify expected directories exist (src/, tests/, config/, .claude/)
   - Check for unexpected files in wrong locations

3. **Package.json Integrity**
   - Has name, version, description
   - Main/exports point to existing files
   - Scripts are defined
   - Dependencies match imports

4. **CLAUDE.md Integrity**
   - Contains architecture overview
   - Contains commands table
   - Contains behavioral rules
   - Slash commands referenced actually exist in .claude/commands/

5. **Empty File Check**
   - Scan all source files for empty content
   - Report as warnings

---

## Step 4: Run Integrity Checks

Following the logic in `integrity-checker.js`, check:

1. **Import Resolution**
   - Read each .js/.ts file
   - Extract all import/require statements
   - Verify each relative import resolves to an existing file

2. **Export Coverage**
   - Check that main index.js exports all public modules
   - Verify README documents exported features

3. **Test Coverage**
   - For each source module, check if a corresponding test file exists
   - Report missing tests as warnings

4. **Security Scan**
   - Check for hardcoded secrets or API keys
   - Check for unsafe patterns (eval, innerHTML)
   - Report as errors

5. **Config Validation**
   - Parse all JSON files to verify valid JSON
   - Check YAML files for syntax issues

---

## Step 5: Generate Report

Present a comprehensive validation report:

```
=== ClawOS Validation Report ===

Score: XX/100

ERRORS (must fix):
  - [ERROR] Missing file: src/middleware/auth.js
  - [ERROR] Import not found: ./utils/helpers in src/core/index.js

WARNINGS (should fix):
  - [WARN] No test file for src/services/user-service.js
  - [WARN] Empty file: src/plugins/.gitkeep

SUMMARY:
  Total files: XX
  Valid files: XX
  Missing files: XX
  Empty files: XX
  Import issues: XX
  Security issues: XX

STATUS: PASS / FAIL
```

If there are errors, offer to **auto-fix** what can be fixed:
- Create missing files with appropriate boilerplate
- Fix broken imports
- Add missing test stubs
- Remove unsafe patterns
