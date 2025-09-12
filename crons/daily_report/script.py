import requests
import smtplib
import os
import pandas as pd
import time
import yaml
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
import re

CONFIG_FILE = './config.yaml'

if not os.path.exists(CONFIG_FILE):
    raise FileNotFoundError(f"Configuration file {CONFIG_FILE} not found.")

with open(CONFIG_FILE, 'r') as file:
    config = yaml.safe_load(file)

API_BASE_URL = config['api_base_url']
EMAIL_ENDPOINT = f"{API_BASE_URL}/insights/emails"
REPORT_ENDPOINT = f"{API_BASE_URL}/insights/report"
SMTP_SERVER = config['smtp_server']
SMTP_PORT = config['smtp_port']
SENDER_EMAIL = config['sender_email']
SENDER_PASSWORD = config['sender_password']
ADMIN_IDS_FILE = config['admin_ids_file']


def log(message: str):
    """ Logs the message to the console.
    Args:
        message (str): The message to log.
    """
    print(f"{time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime())} - {message}")


def is_valid_email(email: str) -> bool:
    """ Validates the email format with regex.
    Args:
        email (str): The email address to validate.
    Returns:
        bool: True if valid, False otherwise.
    """
    regex = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    return re.match(regex, email) is not None


def get_emails(admin_id: str) -> dict[str, str]:
    """ Fetches the email list categorized by project.
    Args:
        admin_id (str): The admin ID to fetch emails for.
    Returns:
        emails (dict[str, str]): A dictionary where keys are project
        names and values are lists of emails.
    """
    response = requests.get(EMAIL_ENDPOINT + f"?adminId={admin_id}")
    if not response.ok:
        log(f"Failed to fetch emails for admin ID {admin_id}.")
        return {}

    return response.json()['emails']


def get_report(admin_id: str, project_name: str) -> str:
    """Fetches the CSV report for a given project.
    Args:
        admin_id (str): The admin ID to fetch the report for.
        project_name (str): The name of the project.
    Returns:
        filename (str): The name of the generated CSV file.
    """
    response = requests.post(
        REPORT_ENDPOINT,
        json={
            "filters": {
                "adminId": admin_id,
                "project": project_name,
            }
        }
    )

    if not response.ok:
        log(f"Failed to fetch report for {project_name}.")
        return None

    json = response.json()['boxes']
    csv = pd.DataFrame(json).to_csv(index=False)
    filename = f"/tmp/report_{os.urandom(3).hex()}.csv"
    with open(filename, "w") as file:
        file.write(csv)

    return filename


def send_email(project_name: str, recipients: str, report_file: str):
    """Sends the email with the report attached.
    Args:
        project_name (str): The name of the project.
        recipients (str): Comma-separated recipient emails.
        report_file (str): The path to the report file.
    """
    if not isinstance(recipients, str):
        log(f"Invalid recipients format for {project_name}, expected str.")
        return

    recipients = [
        email.strip()
        for email in recipients.split(',')
        if email.strip() and is_valid_email(email.strip())
    ]

    if not recipients:
        log(f"No valid recipients for {project_name}.")
        return

    log(f"Sending email to {recipients}...")

    msg = MIMEMultipart()
    msg["From"] = SENDER_EMAIL
    msg["To"] = ", ".join(recipients)
    msg["Subject"] = f"Daily Delivery Report - {project_name}"

    body = f"\
Attached is the daily delivery report for {project_name}.\n\
Current UTC time: {time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime())}\n\
\n\
    "
    msg.attach(MIMEText(body, "plain"))

    with open(report_file, "rb") as attachment:
        part = MIMEBase("application", "octet-stream")
        part.set_payload(attachment.read())
        encoders.encode_base64(part)
        part.add_header(
            "Content-Disposition",
            f"attachment; filename={os.path.basename(report_file)}"
        )
        msg.attach(part)

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.sendmail(SENDER_EMAIL, recipients, msg.as_string())

    log(f"Emails sent successfully for {project_name}.")


def main():
    """Main execution function.
    """
    log("Starting the daily report email script...")
    log("-------")
    if not os.path.exists(ADMIN_IDS_FILE):
        log(f"File {ADMIN_IDS_FILE} does not exist.")
        return

    with open(
        ADMIN_IDS_FILE,
        'r'
    ) as file:
        admin_ids = file.read()
    admin_ids = admin_ids.split(',')
    admin_ids = [admin_id.strip() for admin_id in admin_ids]

    for admin_id in admin_ids:
        email_data = get_emails(admin_id)

        for project, recipients in email_data.items():
            if not recipients:
                log(f"No recipients for project {project}, skipping.")
                continue
            if not project.strip():
                log("Project name is empty, skipping.")
                continue
            report_file = get_report(admin_id.strip(), project.strip())
            if not report_file:
                log(f"No report file for project {project}, skipping email.")
                continue
            send_email(project, recipients, report_file)

    log("-------")
    log("Stopping the daily report email script...")


if __name__ == "__main__":
    main()
