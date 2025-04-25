# TnT Daily Reports Emailer

This script powers the daily delivery report emails for the Track-and-Trace system in Rwanda. It runs automatically via cron and requires no manual intervention under normal conditions.

This README exists only to provide insight into the system’s internals, should debugging or inspection be necessary.

## Overview

- **Report Scope**: Project-specific delivery data per admin
- **Format**: CSV (attached to emails)
- **Recipients**: Fetched dynamically via the API
- **Delivery**: Sent via SMTP to relevant stakeholders

## Configuration Reference

All configuration is handled through a `config.yaml` file, already in place:

```yaml
api_base_url: "https://your-api-host.com"
smtp_server: "smtp.yourprovider.com"
smtp_port: 587
sender_email: "report-bot@example.com"
sender_password: "your-secure-password"
admin_ids_file: "/path/to/admin_ids.txt"
```

*The `admin_ids_file` contains a comma-separated list of admin IDs.*

*This path should be consistent with the path specified in the TnT backend configuration, as the corresponding file is generated automatically by the Track-and-Trace backend whenever admins update their email recipient settings.*

## Dependencies

Python dependencies are listed in `requirements.txt`. A virtual environment (`.venv`) is already set up and used by the cron job.

To install manually (only if needed):

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## What the Script Does

For each `adminId` in the `admin_ids_file`:

1. Calls `/insights/emails` to retrieve project → recipients mapping.
2. Calls `/insights/report` for each project to generate report data.
3. Converts the JSON data to CSV and stores it in `/tmp`.
4. Sends an email per project with the CSV attached.

Logs are output to `stdout.log` and `stderr.log` in the same directory as the script.

- `stdout.log`: Contains successful operations and info messages.
- `stderr.log`: Contains errors and warnings.

## Notes

- No need to edit this script or config for daily use.
- All logic runs unattended, driven by cron.
- Reports reflect the latest data available in the Track-and-Trace backend.
- Another cron deletes log every January 1st.

## Troubleshooting

Check:

- API health: `/insights/emails` and `/insights/report`
- SMTP credentials and network access
- Contents and format of `admin_ids_file` (DO NOT edit manually)

Logs should be your first point of inspection.
