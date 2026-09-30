# CSV Import Format

This document details the CSV formats used for bulk importing metrics and plans into the Haziniy SSP system.

## Daily Facts CSV

Use this format to import daily recorded facts/metrics.

**Example:**
```csv
branch_name,metric_code,date,value[,employee_phone]
Haziniy (Farg'ona),S1,2026-09-15,25
Haziniy (Farg'ona),F1,2026-09-15,5000000
Haziniy (Farg'ona),O1,2026-09-15,150,998901234567
```

**Columns:**
- `branch_name`: The exact name of the branch (text).
- `metric_code`: The unique metric code (e.g., S1, F1, O1).
- `date`: The date of the fact in `YYYY-MM-DD` format.
- `value`: Numeric value representing the recorded metric.
- `employee_phone`: *(Optional)* 12-digit phone number (e.g., 998901234567). Used only for employee-level metrics.

## Monthly Plans CSV

Use this format to import targeted monthly plans.

**Example:**
```csv
branch_name,metric_code,month,value[,employee_phone]
Haziniy (Farg'ona),S1,2026-09,100
Haziniy (Farg'ona),F1,2026-09,50000000
```

**Columns:**
- `branch_name`: The exact name of the branch.
- `metric_code`: The unique metric code.
- `month`: The targeted month in `YYYY-MM` format. The system will convert this internally to the first day of the specified month.
- `value`: Numeric targeted value.
- `employee_phone`: *(Optional)* For specific employee-level metric plans.

## General Notes & Constraints
- **Frontend Processing**: The frontend is responsible for parsing the CSV file and resolving `branch_name` and `metric_code` to their respective UUIDs *before* calling the RPC function.
- **Encoding**: Files must be `UTF-8` encoded.
- **Delimiter**: Use the standard comma `,` delimiter.
- **Headers**: A header row is not strictly required but is highly recommended for clarity and data integrity checking.
- **Error Handling**: Import errors are returned on a per-row basis. Error messages will be provided in Uzbek to assist with localized troubleshooting.
