---
layout: post
title: "Microsoft 365 Tenant Onboarding – End-to-End Administrative Guide"
date: 2025-12-03
excerpt: "Click-by-click Microsoft 365 onboarding guide. Covers tenant foundation, subscription setup, custom domain onboarding, and the beginning of user provisioning."
categories: [Microsoft365, EntraID, Identity]
tags:
  - microsoft-365
  - entra-id
  - tenant-setup
  - domain-onboarding
author: Siddhartha Ghosh
img: /assets/img/o365/2025/12/o365.png
---

# Microsoft 365 Tenant Onboarding – Detailed Administrative Walkthrough

This document is intentionally **long, explicit, and procedural**.  
It reflects **real screenshots captured from a live Microsoft 365 tenant**, in the exact sequence they appear during onboarding.

The objective of this block is to:
- Establish a **clean tenant foundation**
- Validate subscription and billing
- Add and verify a **custom domain**
- Begin **user provisioning**

This is a **mandatory prerequisite** before any Copilot Studio or Power Platform work.

---

## Architectural Context (Before We Begin)

Microsoft 365 is not “just email”. It is a tightly integrated platform consisting of:

- **Microsoft Entra ID** (Identity & authentication)
- **Exchange Online** (Email and calendaring)
- **Microsoft 365 Admin Center** (Control plane)
- **Power Platform** (Low-code + Copilot)
- **Dataverse** (Backend data layer for Copilot & automation)

Every step below changes the **state** of one or more of these components.

---

## STEP 01 – Microsoft 365 Admin Center → Domains

![Step 01](/assets/img/o365/2025/12/o365-onboarding-step-01.png)

You are logged into the **Microsoft 365 Admin Center**.

### Exact navigation
1. Open browser
2. Go to:
   https://admin.microsoft.com
3. Sign in as Global Administrator
4. In the left navigation pane:
   - Click **Settings**
   - Select **Domains**

### What you see on screen
- A list of domains already associated with the tenant
- Typical entries:
  - `techrecepies.onmicrosoft.com` (default)
  - `techmaker.in` (custom, healthy)

### What this confirms technically
- ✅ The tenant already exists
- ✅ Identity namespace is active
- ✅ Domain onboarding is either completed or in progress

### What we are achieving in this step
We are **establishing visibility** into the tenant’s identity namespace.

Without this:
- You cannot create professional user identities
- You cannot receive external email
- Copilot Studio agents cannot be aligned to business identity

This step validates that we are operating inside the **correct tenant boundary**.

---

## STEP 02 – Understanding the Default (`onmicrosoft.com`) Domain

![Step 02](/assets/img/o365/2025/12/o365-onboarding-step-02.png)

Every Microsoft 365 tenant has a **default domain** in the form:

```
<tenant-name>.onmicrosoft.com
```

### Important facts about this domain
- It is created automatically
- It cannot be deleted
- It is used internally by Microsoft services

### Why Microsoft insists on this
- Guarantees a globally unique identity namespace
- Ensures tenant isolation
- Acts as a fallback authentication domain

### What we are achieving
We fully understand:
- Which domain is **system-owned**
- Which domain(s) will be **business-facing**

This distinction becomes critical later for:
- Conditional Access
- MFA enforcement
- Copilot Studio permissions

---

## STEP 03 – Initiating Custom Domain Addition

![Step 03](/assets/img/o365/2025/12/o365-onboarding-step-03.png)

### Action performed
1. Click **Add domain**
2. Enter your business domain:
   ```
   techmaker.in
   ```
3. Click **Use this domain**

### What happens internally
- Microsoft checks for:
  - Domain format validity
  - Whether the domain is already claimed
- No DNS changes yet

### Why this step exists
Microsoft must ensure:
- You are not claiming someone else’s domain
- Identity trust boundaries are respected

### Outcome
- Domain moves into **verification required** state

---

## STEP 04 – Domain Ownership Verification Options

![Step 04](/assets/img/o365/2025/12/o365-onboarding-step-04.png)

Microsoft now asks you to **prove ownership**.

### Verification methods typically offered
- Automatic verification (via supported registrars like GoDaddy)
- Manual verification (TXT record)

### Best practice guidance
✅ Use **automatic verification** for labs and PoCs  
✅ Use **manual DNS** for production environments

### Why this is security-critical
Without ownership proof:
- Email spoofing would be trivial
- Tenant-to-tenant domain hijacking would be possible

---

## STEP 05 – Domain Successfully Verified

![Step 05](/assets/img/o365/2025/12/o365-onboarding-step-05.png)

### System state change
- Domain status = **Verified**
- Domain flagged as healthy

### What this unlocks
- Users can be created with this domain
- Email addresses are allowed
- Authentication policies can bind to the domain

⚠️ Email flow may still not work until MX records are configured.

---

## STEP 06 – Starting Microsoft 365 Business Basic Subscription

![Step 06](/assets/img/o365/2025/12/o365-onboarding-step-06.png)

### Navigation
1. Admin Center → Billing
2. Click **Purchase services**

### Selected plan
- Microsoft 365 Business Basic
- Trial subscription

### Why this plan is chosen
- Lowest cost
- Enables Exchange Online
- Allows Copilot Studio UI access
- Sufficient for PoC environments

Without an active subscription:
- User creation is blocked
- Power Platform access fails

---

## STEP 07 – Entering Organization & Billing Details

![Step 07](/assets/img/o365/2025/12/o365-onboarding-step-07.png)

You are asked to enter:
- Company name
- Address
- Phone number
- Country/region

### What this configures
- Tenant legal identity
- Billing profile
- Tax region

This data is reused across:
- Microsoft billing
- Compliance metadata
- Service availability

---

## STEP 08 – Creating a Dedicated Admin Identity

![Step 08](/assets/img/o365/2025/12/o365-onboarding-step-08.png)

You choose:
- **Create a new account instead**

### Why this matters
- Avoids mixing personal Microsoft IDs
- Creates a clean admin boundary
- Recommended for enterprise hygiene

This identity becomes your **Global Administrator**.

---

## STEP 09 – Adding Payment Method

![Step 09](/assets/img/o365/2025/12/o365-onboarding-step-09.png)

### Important facts
- Card is required even for trial
- No immediate charge
- Subscription auto-renews

This is a **billing enforcement checkpoint**, not a payment event.

---

## STEP 10 – Subscription Activation Complete

![Step 10](/assets/img/o365/2025/12/o365-onboarding-step-10.png)

### System state after this step
✅ Subscription = Active  
✅ License pool exists  
✅ Tenant services initialize asynchronously  

This is the **true start** of a functional tenant.

---

## STEP 11 – Navigating to Active Users

![Step 11](/assets/img/o365/2025/12/o365-onboarding-step-11.png)

### Navigation
- Admin Center → Users → Active users

This is where **human identities** live.

---

## STEP 12 – Adding a New User

![Step 12](/assets/img/o365/2025/12/o365-onboarding-step-12.png)

You enter:
- First name
- Last name
- Username (`@techmaker.in`)
- Temporary password

This creates an **identity object in Entra ID**.

---

## STEP 13 – Assigning License During Creation

![Step 13](/assets/img/o365/2025/12/o365-onboarding-step-13.png)

### Action
- Toggle **Assign license**
- Select Business Basic

### Why this is critical
Without a license:
- No mailbox
- No Teams
- No Copilot UI
- No Power Platform access

---

## STEP 14 – User Successfully Created

![Step 14](/assets/img/o365/2025/12/o365-onboarding-step-14.png)

### Final state for this block
✅ User exists  
✅ User licensed  
✅ Identity ready for login  

---

## Phase 2 – User Validation, Licensing Edge Cases, and Identity Security Hardening

This phase transitions from *basic user creation* into:
- Resource validation (mailbox & license)
- Error conditions an admin typically encounters
- Identity hardening using Microsoft Entra ID
- Enforcement of Multi-Factor Authentication (MFA)

All steps below build directly on the user created in **Step 14**.

---

## STEP 15 – Resetting User Password (Post-Creation Security Step)

![Step 15](/assets/img/o365/2025/12/o365-onboarding-step-15.png)

Immediately after creating a new user, you should **explicitly reset the password** once.

### Navigation
1. Admin Center → Users → Active users
2. Click the newly created user
3. Select **Reset password**

### What to configure
- Enable: **Require this user to change their password when they first sign in**
- Generate a temporary password

### What happens internally
- The password hash is regenerated in Entra ID
- Any cached credentials are invalidated
- The user is forced into a first-time sign-in flow

### What we are achieving
This ensures:
- No administrator-known passwords remain valid
- The user takes ownership of their credentials
- Identity hygiene before MFA is introduced

This step is often skipped — and that’s a common mistake.

---

## STEP 16 – First User Login and Mailbox Provisioning Verification

![Step 16](/assets/img/o365/2025/12/o365-onboarding-step-16.png)

Now validate the user’s workload access.

### Action
1. Open an incognito/private browser window
2. Navigate to:
   ```
   https://outlook.office.com
   ```
3. Sign in with:
   - Username: user@techmaker.in
   - Temporary password (then change it)

### What to observe
- Password change prompt
- Successful login to Outlook Web
- Inbox loads without errors

### What happens behind the scenes
- Exchange Online mailbox auto-provisions
- DNS MX records are validated
- Autodiscover bindings activate

### What we are achieving
We confirm:
✅ License is valid  
✅ Mailbox provisioning succeeded  
✅ Domain email flow is functional  

No Copilot or Power Platform work should start before this passes.

---

## STEP 17 – Navigating to Microsoft Entra Admin Center

![Step 17](/assets/img/o365/2025/12/o365-onboarding-step-17.png)

Identity security is **not configured** in the Microsoft 365 Admin Center UI.

### Navigation
1. Open browser
2. Go to:
   ```
   https://entra.microsoft.com
   ```
3. Sign in as Global Administrator

### Why this step exists
Microsoft separates:
- **Tenant service management** (M365 Admin Center)
- **Identity & access control** (Entra Admin Center)

All MFA, Conditional Access, and identity risk logic lives here.

---

## STEP 18 – Opening the User Object in Entra ID

![Step 18](/assets/img/o365/2025/12/o365-onboarding-step-18.png)

### Navigation
- Entra Admin Center → Users
- Select the newly created user

### What you should verify
- User Principal Name (UPN): `user@techmaker.in`
- Account status: Enabled
- Identity provider: Entra ID

### What we are achieving
We confirm this is a **cloud-only Entra identity**, suitable for:
- MFA
- Copilot Studio
- Power Platform services

This step rules out sync or federation complications.

---

## STEP 19 – Accessing the Per-User MFA Interface

![Step 19](/assets/img/o365/2025/12/o365-onboarding-step-19.png)

### Navigation
- Entra Admin Center → Users
- Select **Per-user MFA**

### Important context
This is the **legacy MFA model**, but:
- Still active
- Still supported
- Ideal for labs and PoCs

Enterprise tenants typically use Conditional Access instead.

---

## STEP 20 – Enabling MFA for the User

![Step 20](/assets/img/o365/2025/12/o365-onboarding-step-20.png)

### Action
1. Select the user
2. Click **Enable**
3. Confirm the dialog

### State transition
- MFA status: Disabled → Enabled

### What this means
- User will be asked to register MFA
- MFA is not yet enforced

This is a preparatory step.

---

## STEP 21 – Enforcing MFA (Critical Security Gate)

![Step 21](/assets/img/o365/2025/12/o365-onboarding-step-21.png)

### Action
1. Select the user again
2. Click **Enforce**
3. Confirm enforcement

### State transition
- MFA status: Enabled → Enforced

### What happens next
- User cannot bypass MFA
- Next login must complete registration

### What we are achieving
This converts MFA from:
> “optional security feature”  
to  
> “mandatory authentication requirement”

---

## STEP 22 – User MFA Registration Prompt

![Step 22](/assets/img/o365/2025/12/o365-onboarding-step-22.png)

During the next sign-in:
- User is blocked from proceeding
- System requires MFA registration

### User-facing actions
- Choose MFA method
- Download Microsoft Authenticator
- Pair account

### Why this is intentional
Microsoft ensures:
- MFA is not silently ignored
- All users follow a standardized security flow

---

## STEP 23 – Registering Microsoft Authenticator App

![Step 23](/assets/img/o365/2025/12/o365-onboarding-step-23.png)

### User actions
1. Install Microsoft Authenticator (mobile)
2. Scan QR code
3. Approve test notification

### Why Microsoft prefers Authenticator
- Stronger security than SMS
- Push-based login approval
- Required later for Copilot Studio

This establishes a modern auth baseline.

---

## STEP 24 – Reviewing Authentication Methods (Before State)

![Step 24](/assets/img/o365/2025/12/o365-onboarding-step-24.png)

Back in Entra Admin Center:
- Open user → Authentication methods

### What you see initially
- No methods registered
- State = empty

This screenshot represents the **pre-registration baseline**.

---

## STEP 25 – Authentication Methods Populated (After State)

![Step 25](/assets/img/o365/2025/12/o365-onboarding-step-25.png)

After registration:
- Microsoft Authenticator listed
- Phone number listed (if added)

### What this confirms
✅ MFA registration is complete  
✅ User can satisfy MFA challenges  
✅ Account recovery options exist  

---

## STEP 26 – Validating MFA from Authentication Methods View

![Step 26](/assets/img/o365/2025/12/o365-onboarding-step-26.png)

### Administrative validation
- MFA methods show as **Enabled**
- Default sign-in method visible

### Why admins must check this
Users often:
- Close registration mid-way
- Assume completion incorrectly

This view gives authority-level confirmation.

---

## STEP 27 – Accessing Power Platform Admin Center

![Step 27](/assets/img/o365/2025/12/o365-onboarding-step-27.png)

Now we shift from identity to **application platform readiness**.

### Navigation
Open:
```
https://admin.powerplatform.microsoft.com
```

### What this validates
- User license is recognized
- Power Platform backend sees the tenant

If this fails, Copilot Studio will fail later.

---

## STEP 28 – Reviewing Default Power Platform Environment

![Step 28](/assets/img/o365/2025/12/o365-onboarding-step-28.png)

### What you see
- Default environment auto-created
- Region inherited from tenant
- Dataverse status: **Not enabled**

### Why this matters
Copilot Studio **depends on Dataverse**.

The absence of Dataverse is intentional at this stage.

---

## STEP 29 – Attempting First Copilot Studio Access

![Step 29](/assets/img/o365/2025/12/o365-onboarding-step-29.png)

### Navigation
Open:
```
https://copilotstudio.microsoft.com
```

### What happens
- UI loads
- Templates visible

### What does NOT happen
- Backend flows cannot execute
- Agent logic cannot persist

This distinction is critical to understand.

---

## STEP 30 – Regional Selection & Initial Copilot Context

![Step 30](/assets/img/o365/2025/12/o365-onboarding-step-30.png)

### User action
- Select region
- Confirm environment

### System behavior
- Region bound to Copilot context
- Compliance boundary enforced

### What we are achieving
✅ Copilot Studio UI readiness  
❌ Backend execution still blocked (Dataverse)  

This intentionally sets up the **failure state** required for the next article.

---

## Phase 3 – Power Platform Constraints, Dataverse Dependency, and Final Tenant State

This final phase completes the onboarding journey by deliberately:
- Hitting platform limitations
- Validating subscription and domain health
- Understanding *why* Copilot Studio is only partially functional
- Freezing the tenant in a **known-good, documented state**

These steps are **critical context** for the next article on Dataverse enablement.

---

## STEP 31 – Reviewing Copilot Studio Landing Experience

![Step 31](/assets/img/o365/2025/12/o365-onboarding-step-31.png)

At this stage, Copilot Studio opens without authentication errors.

### What you observe
- Landing page loads
- Agent creation options visible
- UI behaves normally

### What this confirms
✅ User license is valid  
✅ Tenant is recognized by Copilot Studio  
✅ Identity & MFA requirements are satisfied  

### What it does NOT confirm
❌ Backend execution readiness  
❌ Data persistence capability  

This distinction is extremely important and often misunderstood.

---

## STEP 32 – Exploring Agent Templates

![Step 32](/assets/img/o365/2025/12/o365-onboarding-step-32.png)

### Action
- Browse available Copilot templates

### What Microsoft allows at this stage
- UI exploration
- Agent description
- Topic visualization

### Why Microsoft designs it this way
- Lowers onboarding friction
- Allows evaluation before Dataverse commitment

### Practical implication
Admins often believe “Copilot works” at this point — which is **incorrect**.

---

## STEP 33 – Attempting Agent Creation (Superficially Successful)

![Step 33](/assets/img/o365/2025/12/o365-onboarding-step-33.png)

### What happens
- Agent creation wizard accepts inputs
- No immediate error is thrown

### What is misleading
- Agent *appears* to be created
- No backend store exists yet

### Internal reality
- Metadata held temporarily
- No Dataverse tables provisioned

This step sets up a **false-positive success state**.

---

## STEP 34 – Navigating to Copilot Flows

![Step 34](/assets/img/o365/2025/12/o365-onboarding-step-34.png)

### Action
- Attempt to add logic / flows to the agent

### Why admins try this
- To connect to APIs
- To automate responses
- To integrate with backend systems

This step transitions Copilot from **demo** to **real usage**.

---

## STEP 35 – Flow Creation Failure (Dataverse Dependency Exposed)

![Step 35](/assets/img/o365/2025/12/o365-onboarding-step-35.png)

### Error encountered
```
This feature is currently unavailable for this environment
```
(or equivalent Dataverse-related error)

### Root cause
- Dataverse not enabled
- Business Basic license does not auto-provision Dataverse

### Why this happens
All Copilot logic, variables, topics, and flows are stored in Dataverse.

No Dataverse = No execution.

---

## STEP 36 – Rechecking Environment Configuration

![Step 36](/assets/img/o365/2025/12/o365-onboarding-step-36.png)

### Action
Return to:
```
https://admin.powerplatform.microsoft.com
```

### Validate environment
- Default environment
- Region correct
- Dataverse = **No**

### What we are achieving
We confirm the failure is:
✅ Expected  
✅ Architectural  
✅ Not user error  

This eliminates guesswork.

---

## STEP 37 – Revisiting Domain Settings for Consistency

![Step 37](/assets/img/o365/2025/12/o365-onboarding-step-37.png)

Admins often double-check identity alignment at this point.

### Why this step appears
- Rule out domain misconfiguration
- Ensure Copilot identity continuity

### Conclusion
Domains are healthy.  
Copilot failure is unrelated to identity.

---

## STEP 38 – Reviewing User License Assignment Again

![Step 38](/assets/img/o365/2025/12/o365-onboarding-step-38.png)

### What is being verified
- User still licensed
- License not expired or suspended

### Outcome
✅ License present  
✅ License valid  

This removes licensing ambiguity.

---

## STEP 39 – Subscription Status Confirmation

![Step 39](/assets/img/o365/2025/12/o365-onboarding-step-39.png)

### Navigation
- Admin Center → Billing → Your products

### Verify
- Subscription = Active
- Trial days remaining
- Auto-renewal state

### Why this matters
Expired trials silently block backend services.

---

## STEP 40 – Detailed Subscription View

![Step 40](/assets/img/o365/2025/12/o365-onboarding-step-40.png)

### What this shows
- Exact SKU
- Renewal date
- Assigned licenses

### What we are achieving
A clean billing baseline before enabling paid services like Dataverse.

---

## STEP 41 – Returning to Domains Overview

![Step 41](/assets/img/o365/2025/12/o365-onboarding-step-41.png)

This step confirms nothing has drifted.

### Why it’s important
- Domain issues can cascade into:
  - MFA problems
  - Copilot identity failures

Everything remains healthy.

---

## STEP 42 – Domain Wizard Re-entry (Sanity Check)

![Step 42](/assets/img/o365/2025/12/o365-onboarding-step-42.png)

Microsoft allows re-running the wizard.

### Why admins do this
- Sanity verification
- Documentation screenshots
- Change audits

---

## STEP 43 – Domain Name Re-validation Screen

![Step 43](/assets/img/o365/2025/12/o365-onboarding-step-43.png)

### System behavior
- Recognizes domain immediately
- Skips ownership steps

Confirms persistent domain trust.

---

## STEP 44 – Domain Connection Services Review

![Step 44](/assets/img/o365/2025/12/o365-onboarding-step-44.png)

### Services bound to domain
- Exchange Online
- Identity services

Ensures no regressions.

---

## STEP 45 – Final Domain Status

![Step 45](/assets/img/o365/2025/12/o365-onboarding-step-45.png)

Status remains:
✅ Healthy  
✅ Connected  
✅ In use  

---

## STEP 46 – Final Tenant State Snapshot

![Step 46](/assets/img/o365/2025/12/o365-onboarding-step-46.png)

### Final confirmed state of the tenant

✅ Microsoft 365 tenant active  
✅ Custom domain verified & healthy  
✅ Licensed user created  
✅ MFA enabled & enforced  
✅ Copilot Studio UI accessible  
❌ Dataverse intentionally not enabled  

### Why this is the *ideal* stopping point

At this moment:
- All prerequisites are complete
- All blockers are visible but unresolved
- The environment is perfectly staged for:

> **Next Article: Enabling Dataverse and Unlocking Copilot Studio End-to-End**

---

## Final Thoughts

This onboarding journey was deliberately exhaustive.

By documenting:
- Every click
- Every confirmation
- Every error state

You now have:
- A reproducible lab
- A defensible architecture
- A clean baseline for automation and AI

---
