---
layout: post
title: Build Azure Infra Through Terrafrom Script 
date: 2020-10-29 16:30:00 +0530
description: You’ll find this post in your `_posts` directory. Go ahead and edit it and re-build the site to see your changes. # Add post description (optional)
img: aks-rbac.png # Add image post (optional)
fig-caption: # Add figcaption (optional)
tags: [Terraform, DevOps, Azure]
---
# AKS Architecture & Concepts

## Build the Infra with Terraform

Through this video we are going to bring our concepts regarding AKS RBAC into action. This is going to explain how we can control access to cluster resources using Kubernetes role-based access control and Azure Active Directory identities in Azure Kubernetes Service. Azure Kubernetes Service (AKS) can be configured to use Azure Active Directory (AD) for user authentication. In this configuration, you sign in to an AKS cluster using an Azure AD authentication token. Once authenticated, you can use the built-in Kubernetes role-based access control (Kubernetes RBAC) to manage access to namespaces and cluster resources based on a user's identity or group membership. We will talk about ClusterRole and ClusterRoleBinding RBAC API in Kubernetes, which is used to regulate access and define permissions on namespaced resources.

A role binding grants the permissions defined in a role to users or group. It holds a list of subjects (users, groups, or service principles), and a reference to the role being granted. A RoleBinding grants permissions within a specific namespace whereas a ClusterRoleBinding grants that access cluster-wide.

A RoleBinding may reference any Role in the same namespace. Alternatively, a RoleBinding can reference a ClusterRole and bind that ClusterRole to the namespace of the RoleBinding. If you want to bind a ClusterRole to all the namespaces in your cluster, you use a ClusterRoleBinding, which we have used in our example.


[![AKS RBAC and Azure AD]({{site.baseurl}}/assets/img/aks-rbac.png)](https://youtu.be/cC-OAq03-9g)

e the infrastructure that we will consume as we proceed with Azure Kubernetes Services through DevOps CICD pipelines