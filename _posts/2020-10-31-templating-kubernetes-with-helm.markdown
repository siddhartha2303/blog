---
layout: post
title: Templating Kubernetes with Helm
date: 2022-10-31 00:15:00 +0530
description: Learn how to use Helm to template and manage Kubernetes resources efficiently, with practical examples and best practices.
img: helm.PNG
fig-caption: Helm Chart Templating for Kubernetes
tags: [Terraform, DevOps, Azure]
---

# AKS Architecture & Concepts - Part 3  
## Create Templates for Kubernetes with Helm Charts

> **Helm is the package manager for Kubernetes, enabling you to define, install, and upgrade even the most complex Kubernetes applications. In this article, we explore Helm chart templating, practical use cases, and essential commands to streamline your Kubernetes deployments.**

---

## Table of Contents

1. [Introduction](#introduction)
2. [What is Helm?](#what-is-helm)
3. [Why Use Helm Charts?](#why-use-helm-charts)
4. [Getting Started with Helm](#getting-started-with-helm)
5. [Helm Chart Structure](#helm-chart-structure)
6. [Templating with Helm](#templating-with-helm)
7. [Practical Example](#practical-example)
8. [Video Walkthrough](#video-walkthrough)
9. [Summary](#summary)

---

## Introduction

Managing Kubernetes resources can become complex as your application grows. Helm simplifies this by packaging Kubernetes manifests into reusable charts, allowing you to template, version, and share your deployments.

---

## What is Helm?

Helm is a tool that helps you manage Kubernetes applications using charts. Charts are collections of YAML files that describe a related set of Kubernetes resources.

- **Package Manager:** Like apt or yum, but for Kubernetes.
- **Reusable Templates:** Parameterize your manifests for different environments.
- **Version Control:** Track and roll back releases.

---

## Why Use Helm Charts?

- **Consistency:** Deploy the same configuration across environments.
- **Reusability:** Share charts with your team or the community.
- **Simplicity:** Reduce manual YAML editing and errors.

---

## Getting Started with Helm

Assuming Helm is installed, you can verify with:

```bash
helm version
```

To create a new chart:

```bash
helm create mychart
```

This generates a directory structure with sample templates and values.

---

## Helm Chart Structure

A typical Helm chart contains:

- `Chart.yaml`: Metadata about the chart.
- `values.yaml`: Default configuration values.
- `templates/`: Directory for Kubernetes manifest templates.

Example structure:

```
mychart/
  Chart.yaml
  values.yaml
  templates/
    deployment.yaml
    service.yaml
    ...
```

---

## Templating with Helm

Helm uses Go templating to inject values into your manifests. For example, in `deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Values.appName }}
spec:
  replicas: {{ .Values.replicaCount }}
  template:
    spec:
      containers:
      - name: {{ .Values.appName }}
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
```

Values are defined in `values.yaml`:

```yaml
appName: myapp
replicaCount: 2
image:
  repository: nginx
  tag: stable
```

---

## Practical Example

To install a chart with custom values:

```bash
helm install myrelease ./mychart --set appName=webapp --set replicaCount=3
```

To upgrade or rollback:

```bash
helm upgrade myrelease ./mychart --set replicaCount=5
helm rollback myrelease 1
```

---

## Video Walkthrough

For a hands-on demonstration, watch the following video:

[![Helm]({{site.baseurl}}/assets/img/helm-video.PNG)](https://youtu.be/zfWef_ipSBw)

---

## Summary

Helm charts empower you to manage Kubernetes resources efficiently, enabling templating, versioning, and sharing of your deployments. Start using Helm to simplify your Kubernetes workflows and accelerate your DevOps journey.

---

**Ready to template your Kubernetes resources?**  
Explore more on [Helm Documentation](https://helm.sh/docs/) or share your experience in the comments below!