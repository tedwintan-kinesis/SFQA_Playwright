# PROPOSAL: SCALING ARCHITECTURE & SALESFORCE SECURITY ASSESSMENT
**PROJECT**: SFQA Playwright Automation Dashboard

## IMPLEMENTED PLATFORMS
- **Data storage** (Test scripts and test execution results): GitHub, cost 0
- **Website Hosting**: Vercel, cost 0
- **Integration**: with Zephyr Scale to store test results, cost 0
- **Automation framework**: Playwright, an open sourced tool that simulates browser actions such as button click, typing, etc
- **Development tool**: Visual Studio Code

## FUTURE ENHANCEMENTS AND SCALING
To support multiple users running tests at the same time and to store large files (like screenshots), the following platforms are recommended:
- **Cloud Database** (e.g., Supabase, MongoDB Atlas): Upgrading from GitHub files to a proper database. This prevents data from crashing or overriding when multiple users execute tests simultaneously.
- **Cloud CI/CD Execution** (e.g., GitHub Actions): Running tests on cloud servers instead of local machines. This enables running multiple tests at once in a scalable way.
- **Object Storage** (e.g., AWS S3, Google Cloud): A dedicated bucket to store heavy test evidence, such as screenshots, video recordings, and trace logs.

## SALESFORCE SECURITY & COMPLIANCE
The automation tool introduces no security risks to Salesforce. The reasons are detailed below:

### Access Method
- **UI-Level Execution**: Interacts exclusively via the front-end browser, mirroring human behavior without backend API data injections. (similar to Zephyr automation Reflect)
- Salesforce Permissions provided to the tool follows by the account level (e.g. Irma's SF login credentials)

### Affected Data
- **Sandbox Only**: Operates strictly within Salesforce Sandboxes (QA/UAT), never touching live Production data.
- **Controlled Scope**: Only creates/edits explicit dummy records. No bulk data extraction or mass deletion.

### Credential Management
- **No Exposed Passwords**: Real passwords are never saved in the testing tool or uploaded to GitHub. They are managed strictly as Environment Variables (kept in local .gitignore files or locked securely in cloud server settings) and only accessed temporarily when a test runs.
- **Dedicated Accounts**: Uses isolated "Test User" accounts with minimum privileges, avoiding human account misuse.

## DATA PRIVACY & INFRASTRUCTURE COMPLIANCE
To comply with the company's Privacy & Confidentiality (P&C) and data security requirements, the automation dashboard and associated scripts will be hosted entirely within approved enterprise environments:
- **Code Repository**: All source code, test scripts, and framework configurations will be migrated from personal accounts to the approved ABX organization's repository in GitHub.
- **Dedicated Hosting Platform**: The website dashboard, APIs, and execution engines will be hosted on approved, dedicated company servers, utilizing platforms such as ABX's Google Cloud or AWS.

## BENEFITS & ADVANTAGES
- **Low-Code Interface with High Configurability**: Provides an easy-to-use dashboard for running tests, backed by actual Playwright code which allows infinite customization for complex Salesforce flows.
- **Extreme Versatility**: Far more configurable and flexible than rigid commercial low-code tools like Smartbear Reflect or BugBug.
- **No Vendor Lock-in**: Built on open-source Playwright and Next.js. The code is fully owned and can be moved anywhere without paying expensive commercial software licenses.

## COST ESTIMATION
- **Development & Framework**: $0 (Open-source Playwright, React/Next.js).
- **Hosting** (Vercel): Free tier available; Pro plan is $20/month if needed for larger teams.
- **Database & Storage** (Supabase/Firebase): Generous free tier; Pro plans start around $25/month for heavy artifact storage.
- **CI/CD Compute** (GitHub Actions): 2,000 free minutes/month; very affordable for extra run time.
- **Total Cost of Ownership**: A tiny fraction of the cost compared to enterprise tools like Smartbear Reflect or BugBug, which can cost thousands of dollars a year.

## CONCLUSION
The automation architecture poses no underlying risk to Salesforce security because it operates strictly within the boundaries of a simulated human user. Upgrading to a cloud database and cloud execution will allow testing efforts to scale efficiently while maintaining strict security protocols.
