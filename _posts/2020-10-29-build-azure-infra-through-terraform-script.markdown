---
layout: post
title: Build Azure Infra Through Terrafrom Script 
date: 2022-10-29 16:30:00 +0530
description: You’ll find this post in your `_posts` directory. Go ahead and edit it and re-build the site to see your changes. # Add post description (optional)
img: terraform.PNG # Add image post (optional)
fig-caption: # Add figcaption (optional)
tags: [Terraform, DevOps, Azure]
---
# AKS Architecture & Concepts - Part 1

## Build the Infra with Terraform

We are first going to setup the infrastructure through Terraform code. Resources that we will deploy are Storage, Database and Azure Key Vault. First step would be to create **provider.tf** as below.

Here we are adding two providers, i.e. Azure DevOps and Azure Resource Manager. We are then going to provide the URL of our Azure DevOps organization and mention the personal access token.

```
terraform {

  required_providers {

    azuredevops = {

      source  = "microsoft/azuredevops"

      version = "0.1.3"

    }

    azurerm = {

      source  = "hashicorp/azurerm"

      version = "3.14.0"

    }

  }

}


provider "azuredevops" {

  org_service_url       = "https://dev.azure.com/siddhartha2303"

  personal_access_token = "personal access token here"

}

provider "azurerm" {

  features {}

}
```

Personal access token on Azure DevOps can be created as below.

![Personal access token on Azure DevOps]({{site.baseurl}}/assets/img/Aspose.Words.46e0d902-7e6c-4f68-aa4e-889678ab0c6d.001.png)

Next step would be to create **variable.tf** file as blow. This contains all variables to be called inside **main.tf**

```
variable "rg_name" {

  type        = string

  description = "This is resource group name"

}

variable "location" {

  type        = string

  description = "This is location of resource group"

}

variable "environment" {

  type = string

}

variable "kv_name" {

  type = string

}

variable "strg_name" {

  type = string

}

variable "strgContainer_name" {

  type = string

}

variable "db_name" {

  type = string

}

variable "dbsrv_name" {

  type = string

}

variable "client_secret" {

  type = string

}

variable "service_endpoint_id" {

  type = string

}
```

Below **terraform.tfvars** file contains the values for the variables that we defined above. Fill **client_secret** and **service_endpoint_id**

```
strg_name          = "tfstorageactdemo10"

strgContainer_name = "tfstoragecontainer"

kv_name            = "tfkvdemo-1000022"

environment        = "development"

location           = "eastus"

rg_name            = "TfDemo01"

db_name            = "tfdemodb006"

dbsrv_name         = "tfdemodbsrv006"

client_secret      = "place your client secret here" 

service_endpoint_id = "your ADO service endpoint ID"
```

Service endpoint ID can be found in Azure DevOps as below. If don’t exist then we need to create one. This is how Azure DevOps is integrated with Azure subscription. 

![Service endpoint ID]({{site.baseurl}}/assets/img/Aspose.Words.46e0d902-7e6c-4f68-aa4e-889678ab0c6d.002.png) 

And for **client_secret**, you need to create a Service Principal in Azure.

![]({{site.baseurl}}/assets/img/Aspose.Words.46e0d902-7e6c-4f68-aa4e-889678ab0c6d.003.png)

We then need to start with main.tf Step by step approach would be as below.

* Create a resource group

```
resource "azurerm_resource_group" "rg" {

  name     = var.rg_name

  location = var.location

  tags = {

    environment = var.environment

  }

}
```

* Get the details for Azure Dev Ops, current subscription and Service Principal

```
data "azuredevops_project" "AKS-DEMO" {

  name = "AKS-DEMO"

}

data "azuread_service_principal" "tfServicepPrincipal" {

  display_name = "tfServicepPrincipal"

}

data "azurerm_subscription" "subscriptionID" {

}

data "azurerm_client_config" "current" {}
```

* Create Key Vault and assign Access Policy to Service Principal

```
resource "azurerm_key_vault" "kv1" {

  depends_on                 = [azurerm_resource_group.rg, module.create_storage]

  name                       = var.kv_name

  location                   = var.location

  resource_group_name        = var.rg_name

  tenant_id                  = data.azurerm_client_config.current.tenant_id

  soft_delete_retention_days = 7

  purge_protection_enabled   = false

  sku_name                   = "standard"

  access_policy {

    tenant_id = data.azurerm_client_config.current.tenant_id

    object_id = data.azurerm_client_config.current.object_id

    //application_id = data.azuread_service_principal.tfServicepPrincipal.application_id

    key_permissions = [

      "Get",

    ]

    secret_permissions = [

      "Get", "Backup", "Delete", "List", "Purge", "Recover", "Restore", "Set",

    ]

    storage_permissions = [

      "Get",

    ]

  }

  access_policy {

    tenant_id = data.azurerm_client_config.current.tenant_id

    object_id = data.azuread_service_principal.tfServicepPrincipal.object_id

    key_permissions = [

      "Get", "List"

    ]

    secret_permissions = [

      "Get", "Backup", "Delete", "List", "Purge", "Recover", "Restore", "Set",

    ]

    storage_permissions = [

      "Get",

    ]

  }

}
```

* Call the Storage module and provide the parameters

```
module "create_storage" {

  source             = "../Modules/storage"

  rg_name            = var.rg_name

  strg_name          = var.strg_name

  strgContainer_name = var.strgContainer_name

  depends_on         = [azurerm_resource_group.rg]

}
```

* Once these resources will be created Terraform will proceed to creating the Secrets in KeyVault. You can see in below code it’s dependent on creation of storage module **“depends_on = [module.create_storage]”** as storage keys will be available once it’s created.

```
resource "azurerm_key_vault_secret" "client-id" {

  name         = "client-id"

  value        = data.azuread_service_principal.tfServicepPrincipal.application_id

  key_vault_id = azurerm_key_vault.kv1.id

  depends_on = [

    module.create_storage

  ]

}

resource "azurerm_key_vault_secret" "client-secret" {

  name         = "client-secret"

  value        = var.client_secret

  key_vault_id = azurerm_key_vault.kv1.id

  depends_on = [

    module.create_storage

  ]

}

resource "azurerm_key_vault_secret" "TenantID" {

  name         = "TenantID"

  value        = data.azurerm_subscription.subscriptionID.tenant_id

  key_vault_id = azurerm_key_vault.kv1.id

  depends_on = [

    module.create_storage

  ]

}

resource "azurerm_key_vault_secret" "SubscriptionID" {

  name         = "SubscriptionID"

  value        = data.azurerm_subscription.subscriptionID.subscription_id

  key_vault_id = azurerm_key_vault.kv1.id

  depends_on = [

    module.create_storage

  ]

}

resource "azurerm_key_vault_secret" "strgKey1" {

  name         = "strgKey1"

  value        = module.create_storage.storage_primary_access_key

  key_vault_id = azurerm_key_vault.kv1.id

  depends_on = [

    module.create_storage

  ]

}

resource "azurerm_key_vault_secret" "strgKey2" {

  name         = "strgKey2"

  value        = module.create_storage.storage_secondary_access_key

  key_vault_id = azurerm_key_vault.kv1.id

  depends_on = [

    module.create_storage

]

}
```

* Next Terraform will proceed with SQL database creation. And Key Vault should be ready prior to this as Database is going to store it’s connection string into it.

```
module "create_db" {

  source             = "../Modules/db"

  rg_name            = var.rg_name

  keyvault_name      = var.kv_name

  sql_server_name    = var.dbsrv_name

  sql_database_name  = var.db_name

  sql_admin_login    = var.dbsrv_name

  sql_admin_password = "India@123"

  depends_on         = [azurerm_resource_group.rg, azurerm_key_vault.kv1]

}
```

* Then it will configure Azure DevOps to link Azure Key Vault to get the secrets against each variables.

```
resource "azuredevops_variable_group" "azdevops-variable-group" {

  depends_on = [

    azurerm_key_vault_secret.client-id,

    azurerm_key_vault_secret.client-secret,

    azurerm_key_vault_secret.TenantID,

    azurerm_key_vault_secret.SubscriptionID,

    azurerm_key_vault_secret.strgKey1,

    azurerm_key_vault_secret.strgKey2,

  ]

  project_id   = data.azuredevops_project.AKS-DEMO.project_id

  name         = "azkeys"

  description  = "key vault keys"

  allow_access = true

  key_vault {

    name                = var.kv_name

    service_endpoint_id = var.service_endpoint_id

  }

  variable {

    name = "client-secret"

  }

  variable {

    name = "client-id"

  }

  variable {

    name = "TenantID"

  }

  variable {

    name = "SubscriptionID"

  }

  variable {

    name = "strgKey1"

  }

  variable {

    name = "strgKey2"

  }

}
```

This will complete the infrastructure that we will consume as we proceed with Azure Kubernetes Services through DevOps CICD pipelines