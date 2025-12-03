---
layout: post
title: "Creating and Setting Up a Microsoft 365 Tenant and Users"
date: 2025-12-03
excerpt: "A detailed, step-by-step guide to creating a Microsoft 365 tenant, configuring security baselines, and provisioning users through the Microsoft 365 Admin Center."
categories: [Microsoft365, Identity, Cloud]
tags:
  - microsoft-365
  - office-365
  - entra-id
  - identity-management
  - user-provisioning
author: Siddhartha Ghosh
image: /assets/img/o365/2025/12/m365-tenant-user-creation.png
---

## Overview

Microsoft 365 (formerly Office 365) is often the first SaaS platform adopted when an organization starts its cloud journey.  
Before users can sign in to Outlook, Teams, SharePoint, or OneDrive, you need a **tenant**, some basic **security configuration**, and at least one **user account**.

This article is a **hands-on, lab-friendly walkthrough** that takes you from **zero to a working Microsoft 365 tenant** with real users created via the **Microsoft 365 Admin Center**.  
You can follow it for:

- Personal lab and practice
- Small-business setups
- Customer PoCs or demos

The focus is on **clarity, repeatability, and security-conscious defaults**.

---

## High-Level Flow

![High-level Microsoft 365 tenant and user creation flow](/assets/img/o365/2025/12/m365-tenant-user-creation.png)

*Figure 1: End-to-end workflow for Microsoft 365 tenant creation, security configuration, and user provisioning*

At a high level, we will:

1. Create a Microsoft 365 tenant and global admin.
2. Explore the Microsoft 365 Admin Center.
3. (Optionally) Add a custom domain.
4. Configure security defaults and MFA.
5. Review administrative roles.
6. Create users and assign licenses.
7. Verify user sign-in and monitor service health.

---

## Prerequisites

Before you start, you should have:

- A working email address to register the tenant.
- Internet access and a modern browser.
- (Optional) A custom domain name if you want branded usernames like `user@yourcompany.com`.

You **do not** need PowerShell, scripting, or any automation tools for this guide. Everything is done through the portal.

---

## Step 1: Create a Microsoft 365 Tenant

![Microsoft 365 tenant creation page](/assets/img/o365/2025/12/m365-tenant-creation.png)

*Figure 2: Initial Microsoft 365 sign-up and tenant creation screen*

1. Go to the official Microsoft 365 sign-up page for trials or small business plans.
2. Choose a plan suitable for your lab or PoC (for example, a Microsoft 365 Business or developer subscription).
3. When prompted for your **business name**, Microsoft will propose a default tenant domain like:

   ```text
   <your-name>.onmicrosoft.com
   ```

4. Verify your email and complete the sign-up wizard.
5. Set a strong password for the initial **global administrator** account.

At the end of this step, you have:

- A new **Microsoft 365 tenant**.
- One **Global Administrator** account, typically `admin@<tenant>.onmicrosoft.com`.

---

## Step 2: Explore the Microsoft 365 Admin Center

![Microsoft 365 admin center dashboard](/assets/img/o365/2025/12/m365-admin-center-dashboard.png)

*Figure 3: Microsoft 365 Admin Center home page*

1. Sign in to the [Microsoft 365 Admin Center](https://admin.microsoft.com) using your global admin credentials.
2. The **Home** dashboard shows:
   - User and license counts.
   - Setup cards and recommendations.
   - Service health summaries.

3. On the left navigation pane, note the key areas:
   - **Users** → Active users, guest users, contacts.
   - **Groups** → Microsoft 365 groups, security groups, distribution lists.
   - **Billing** → Licenses, subscriptions, billing accounts.
   - **Health** → Service health, message center.

Spending a few minutes here gives you a mental map of where user creation and tenant-level settings live.

---

## Step 3: Add and Verify a Custom Domain (Optional but Recommended)

![Microsoft 365 domain setup wizard](/assets/img/o365/2025/12/m365-domain-setup.png)

*Figure 4: Adding and verifying a custom domain in Microsoft 365*

You can use the default `onmicrosoft.com` domain in labs, but for production or customer-facing environments a **custom domain** is preferred.

1. In the Admin Center, go to **Settings → Domains**.
2. Select **Add domain** and enter your domain, for example:

   ```text
   yourcompany.com
   ```

3. Microsoft will provide DNS records (TXT or MX) to add at your domain registrar.
4. Add the records in your DNS provider’s portal.
5. Return to the Admin Center and click **Verify**.

Once verified, you can start using usernames like `user@yourcompany.com` instead of `user@tenant.onmicrosoft.com`.

---

## Step 4: Configure Security Defaults and MFA

Security should never be an afterthought. Before you start creating many users, you should decide on your **baseline security posture**.

### 4.1 Enable Security Defaults

![Microsoft 365 security defaults configuration](/assets/img/o365/2025/12/m365-security-defaults.png)

*Figure 5: Enabling security defaults for the tenant*

1. In the Admin Center, open the **Entra ID / Azure AD** portal (often via a link from the admin center).
2. Navigate to **Properties → Manage security defaults**.
3. Turn **Security defaults** **On** if you are in a lab or small environment.

Security defaults automatically enforce:

- Modern authentication only
- Basic MFA prompts for admin and user accounts
- Blocking legacy protocols in many cases

> 💡 **Tip:** For enterprises, you may replace security defaults with Conditional Access policies instead of using the simple switch.

### 4.2 Check MFA Experience

![Microsoft 365 MFA setup prompt](/assets/img/o365/2025/12/m365-mfa-setup.png)

*Figure 6: User MFA registration prompt during sign-in*

As users sign in, they will be prompted to register MFA methods such as:

- Microsoft Authenticator app
- SMS / phone calls (depending on configuration)

This is an important part of your user onboarding communication and documentation.

---

## Step 5: Review Administrative Roles

![Microsoft 365 admin roles overview](/assets/img/o365/2025/12/m365-admin-roles.png)

*Figure 7: Reviewing admin roles to follow least-privilege principles*

Using a single **Global Administrator** for everything is convenient in labs but risky in production.

1. In the Admin Center, go to **Roles** or **Entra ID → Roles and administrators**.
2. Review built-in roles such as:
   - Global administrator
   - User administrator
   - Exchange administrator
   - Teams administrator
3. Assign roles based on **least privilege**, for example:
   - Helpdesk staff → *Helpdesk administrator*.
   - Identity team → *User administrator*.

This reduces your attack surface while keeping operations functional.

---

## Step 6: Create a New User

![Microsoft 365 user creation wizard](/assets/img/o365/2025/12/m365-user-creation-wizard.png)

*Figure 8: Guided wizard for creating a new Microsoft 365 user*

1. In the Admin Center, go to **Users → Active users**.
2. Click **Add a user**.
3. In the wizard:
   - Enter **Display name** (for example, `John Doe`).
   - Enter **Username**, such as `john.doe@yourcompany.com`.
4. Choose how to handle the initial password:
   - Let Microsoft generate a password, or
   - Specify your own strong temporary password.
5. Decide whether the user must **change password on first sign-in** (recommended).

This creates the identity object in your tenant but does not yet guarantee access to all workloads—that depends on license assignment.

---

## Step 7: Assign Licenses to the User

![Microsoft 365 user license assignment screen](/assets/img/o365/2025/12/m365-user-license-assignment.png)

*Figure 9: Assigning Microsoft 365 licenses to the new user*

During the user creation wizard (or afterward by editing the user), you must assign licenses.

1. In the same wizard, go to the **Licenses** section.
2. Select one or more available Microsoft 365 subscriptions, for example:
   - Microsoft 365 Business Standard
   - Office 365 E3 / E5
3. Optionally expand the license to enable/disable individual service plans such as:
   - Exchange Online
   - Microsoft Teams
   - SharePoint Online
   - OneDrive for Business

If you skip this step, the user will exist but will not be able to use most apps.

---

## Step 8: Review the User Summary

![Microsoft 365 user summary page](/assets/img/o365/2025/12/m365-user-summary.png)

*Figure 10: Final review of user settings and licenses*

Before you finalize, the wizard shows a **summary page**.

Verify:

- Username and sign-in address.
- Display name.
- Licenses attached.
- Admin roles (if any).
- Location / usage location (important for some licenses).

Click **Finish adding** or **Create user** to complete provisioning.

---

## Step 9: Test User Sign-in and MFA

![Microsoft 365 user sign-in and MFA verification](/assets/img/o365/2025/12/m365-user-signin-verification.png)

*Figure 11: New user signing in and completing MFA registration*

1. Open a private/incognito browser window.
2. Go to `https://portal.office.com` or `https://www.office.com`.
3. Sign in with the new user’s credentials.
4. If security defaults or MFA policies are enabled, the user will be prompted to:
   - Register MFA methods.
   - Confirm phone number or mobile app registration.

Ask the user (or yourself, if this is a lab) to complete the MFA setup, then verify:

- Access to Outlook, Teams, or other licensed apps.
- No unexpected error messages or license warnings.

---

## Step 10: Monitor Service Health

![Microsoft 365 service health dashboard](/assets/img/o365/2025/12/m365-service-health.png)

*Figure 12: Service health overview in the admin center*

Once your tenant and users are ready, you should have a habit of monitoring **service health**.

1. In the Admin Center, go to **Health → Service health**.
2. Review:
   - Current incidents.
   - Advisories impacting services like Exchange, Teams, or SharePoint.
3. For production environments, configure **email notifications** for major incidents or subscribe to RSS feeds where available.

This helps you quickly differentiate between:

- A user-specific issue (license, configuration, device), and  
- A broader Microsoft service issue.

---

## Recap and Next Steps

In this guide you:

1. Created a **Microsoft 365 tenant** and global admin.
2. Explored the **Microsoft 365 Admin Center**.
3. (Optionally) Configured a **custom domain**.
4. Enabled **security defaults and MFA** to protect accounts.
5. Reviewed and understood **admin roles**.
6. Created a **user** using the built-in wizard.
7. Assigned appropriate **licenses**.
8. Verified **user sign-in and MFA behavior**.
9. Learned to monitor **service health** at the tenant level.

This flow is a solid foundation for:

- Building automation later (PowerShell, Graph API, or Identity automation tools).
- Onboarding more users or entire departments.
- Expanding into Teams, SharePoint, Exchange Online, and security workloads.

You can now reuse this tenant for **labs, demos, and PoCs**, or treat it as a reference baseline for more advanced Microsoft 365 deployments.
