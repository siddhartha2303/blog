---
layout: post
title: "What Really Happens Before Frontier Models Answer?"
date: 2026-06-06
description: "A structured explanation of attention, FFN, prefill, decode, KV cache, memory bandwidth, agentic cache reuse, and Mixture of Experts inference."
excerpt: "Before the first token appears, an LLM has already read the prompt, built attention context, created KV cache entries, moved weights through GPU memory, and prepared the next-token loop."
categories: [AI, LLM, Inference]
tags:
  - llm-inference
  - transformer
  - attention
  - kv-cache
  - prefill
  - decode
  - memory-bandwidth
  - mixture-of-experts
  - moe
  - agentic-ai
---

<style>
  .llm-mag {
    --ink: #1d2433;
    --muted: #5b6474;
    --cream: #fffaf3;
    --paper: #fdf7ef;
    --line: rgba(29, 36, 51, 0.14);
    --olive: #3f4738;
    --brown: #724126;
    --cobalt: #3f6175;
    --teal: #4d7264;
    --amber: #9a6635;
    --rose: #914d42;
    --violet: #665870;
    --blue-soft: #eef3f4;
    --teal-soft: #eef6f0;
    --amber-soft: #fbefe0;
    --rose-soft: #faece8;
    --violet-soft: #f1edf3;
    color: var(--ink);
    background: var(--paper);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 1rem;
    line-height: 1.78;
    width: min(100%, 1420px);
    margin: 0 auto;
    padding: 0 3.8rem 3.6rem;
  }

  .llm-mag,
  .llm-mag * {
    box-sizing: border-box;
  }

  .llm-mag h1,
  .llm-mag h2,
  .llm-mag h3,
  .llm-mag p,
  .llm-mag li,
  .llm-mag blockquote {
    letter-spacing: 0;
  }

  .llm-mag h1,
  .llm-mag h2,
  .llm-mag h3 {
    color: #111827;
    font-family: Georgia, "Times New Roman", serif;
    line-height: 1.05;
  }

  .llm-mag h1 {
    margin: 0;
    max-width: none;
    font-size: clamp(1.65rem, 3.3vw, 2.75rem);
    font-weight: 900;
    text-transform: uppercase;
  }

  .llm-mag h2 {
    margin: 0;
    font-size: clamp(1.75rem, 4vw, 3rem);
  }

  .llm-mag h3 {
    margin: 1.55rem 0 0.55rem;
    font-size: 1.35rem;
  }

  .llm-mag p {
    margin: 0.82rem 0;
  }

  .llm-mag .mag-section p,
  .llm-mag .mag-section li,
  .llm-mag .mag-intro p,
  .llm-mag .mag-lead,
  .llm-mag .mag-note p,
  .llm-mag .mag-card p,
  .llm-mag .mag-list-panel p,
  .llm-mag .mag-end p {
    text-align: justify;
    text-align-last: left;
    text-justify: inter-word;
    hyphens: auto;
  }

  .llm-mag ul {
    margin: 0.75rem 0 1.05rem 1.25rem;
    padding: 0;
  }

  .llm-mag li {
    margin: 0.36rem 0;
    padding-left: 0.1rem;
  }

  .llm-mag blockquote {
    margin: 1rem 0;
    padding: 1rem 1.05rem;
    border-left: 6px solid var(--brown);
    background: var(--cream);
    color: #2c3548;
    font-size: 1.05rem;
  }

  .llm-mag code {
    padding: 0.08rem 0.3rem;
    border: 1px solid rgba(63, 97, 117, 0.28);
    border-radius: 6px;
    background: var(--blue-soft);
    color: var(--cobalt);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 0.92em;
    font-weight: 850;
    white-space: nowrap;
  }

  .mag-hero {
    display: grid;
    grid-template-columns: 22% minmax(0, 48%) 30%;
    min-height: 520px;
    margin: 2rem 0 3.4rem;
    border: 1px solid var(--line);
    background: var(--paper);
    overflow: hidden;
  }

  .mag-rail {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background: var(--olive);
    color: #ffffff;
  }

  .mag-rail span {
    display: block;
    font-family: Georgia, "Times New Roman", serif;
    font-size: clamp(2rem, 4vw, 3.2rem);
    font-weight: 800;
    line-height: 1.08;
    text-align: center;
    text-transform: uppercase;
    writing-mode: vertical-rl;
    transform: rotate(180deg);
  }

  .mag-hero-main {
    padding: 4rem 3.6rem 3rem;
  }

  .mag-kicker,
  .mag-label,
  .mag-section-tag {
    color: var(--brown);
    font-size: 0.78rem;
    font-weight: 950;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .mag-lead {
    max-width: none;
    margin-top: 1.25rem;
    color: #334155;
    font-size: 1.12rem;
    line-height: 1.72;
  }

  .mag-hero-side {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.35rem 1.55rem;
    background: var(--brown);
    color: #ffffff;
  }

  .mag-side-title {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 1.25rem;
    font-weight: 900;
    line-height: 1.12;
    text-transform: uppercase;
  }

  .mag-side-list {
    display: grid;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .mag-side-list span {
    display: block;
    padding: 0.55rem 0;
    border-top: 1px solid rgba(255, 255, 255, 0.26);
    color: rgba(255, 255, 255, 0.92);
    font-size: 0.92rem;
    font-weight: 800;
  }

  .mag-intro {
    margin: 1.8rem 0 2.8rem;
    columns: 2 300px;
    column-gap: 5rem;
  }

  .mag-intro p:first-child::first-letter {
    float: left;
    margin: 0.08rem 0.5rem 0 0;
    color: var(--brown);
    font-family: Georgia, "Times New Roman", serif;
    font-size: 4.5rem;
    font-weight: 900;
    line-height: 0.85;
  }

  .mag-section {
    margin: 4.4rem 0;
  }

  .mag-opener {
    display: grid;
    grid-template-columns: minmax(120px, 12%) minmax(0, 1fr);
    gap: 2rem;
    align-items: stretch;
    margin: 3.8rem 0 2.3rem;
    border: 1px solid var(--line);
    background: #f8efdf;
    transform: translateY(-4px);
    box-shadow:
      0 18px 34px rgba(29, 36, 51, 0.14),
      0 6px 14px rgba(29, 36, 51, 0.08);
  }

  .mag-opener.blue {
    border-top: 8px solid var(--cobalt);
  }

  .mag-opener.teal {
    border-top: 8px solid var(--teal);
  }

  .mag-opener.amber {
    border-top: 8px solid var(--amber);
  }

  .mag-opener.rose {
    border-top: 8px solid var(--rose);
  }

  .mag-opener.violet {
    border-top: 8px solid var(--violet);
  }

  .mag-number {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 110px;
    background: #111827;
    color: #ffffff;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 2.4rem;
    font-weight: 900;
  }

  .mag-opener-body {
    padding: 1.45rem 2rem;
  }

  .mag-body-grid {
    display: grid;
    grid-template-columns: minmax(0, 2.35fr) minmax(280px, 0.65fr);
    gap: 2.2rem;
    align-items: start;
  }

  .mag-section-split {
    display: grid;
    grid-template-columns: minmax(0, 2.35fr) minmax(280px, 0.65fr);
    gap: 2.2rem;
    align-items: stretch;
  }

  .mag-section-split-main {
    min-width: 0;
  }

  .mag-section-split-side {
    display: flex;
    align-items: stretch;
  }

  .mag-section-split-side .mag-note {
    width: 100%;
    margin: 0;
    align-content: start;
  }

  .mag-section-split-side .mag-note {
    border: 0;
    border-top: 8px solid rgba(255, 255, 255, 0.34);
    background: var(--brown);
    color: #ffffff;
    transform: translateY(-7px);
    box-shadow:
      0 34px 60px rgba(0, 0, 0, 0.34),
      14px 18px 28px rgba(0, 0, 0, 0.20),
      0 0 0 6px rgba(29, 36, 51, 0.07);
  }

  .mag-section-split-side .mag-note.blue {
    background: var(--cobalt);
  }

  .mag-section-split-side .mag-note.teal {
    background: var(--teal);
  }

  .mag-section-split-side .mag-note.amber {
    background: var(--amber);
  }

  .mag-section-split-side .mag-note.rose {
    background: var(--rose);
  }

  .mag-section-split-side .mag-note.violet {
    background: var(--violet);
  }

  .mag-section-split-side .mag-note strong,
  .mag-section-split-side .mag-note p {
    color: #ffffff;
  }

  .mag-section-split-side .mag-icon {
    border-color: rgba(255, 255, 255, 0.44);
    background: rgba(255, 255, 255, 0.16);
    color: #ffffff;
  }

  .mag-text-columns {
    columns: 2 300px;
    column-gap: 2.2rem;
    margin: 1.3rem 0;
  }

  .mag-text-columns p {
    break-inside: avoid;
  }

  .mag-thin-bar {
    height: 8px;
    margin: 1.45rem 0 0.85rem;
    background: linear-gradient(90deg, var(--violet), var(--teal), var(--amber));
  }

  .mag-aside {
    position: sticky;
    top: 1rem;
  }

  .mag-card,
  .mag-note,
  .mag-pull,
  .mag-calc,
  .mag-list-panel {
    border-radius: 0;
  }

  .mag-note {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr);
    gap: 0.75rem;
    margin: 1.05rem 0;
    padding: 0.95rem;
    border: 1px solid var(--line);
    background: var(--blue-soft);
  }

  .mag-note.teal {
    background: var(--teal-soft);
  }

  .mag-note.amber {
    background: var(--amber-soft);
  }

  .mag-note.rose {
    background: var(--rose-soft);
  }

  .mag-note.violet {
    background: var(--violet-soft);
  }

  .mag-note.dark {
    background: var(--olive);
    color: #ffffff;
  }

  .mag-note strong {
    display: block;
    margin-bottom: 0.18rem;
    color: #111827;
    font-size: 0.98rem;
  }

  .mag-note.dark strong,
  .mag-note.dark p {
    color: #ffffff;
  }

  .mag-note p {
    margin: 0;
    color: #334155;
    font-size: 0.95rem;
    line-height: 1.6;
  }

  .mag-aside .mag-note {
    border: 0;
    border-top: 8px solid rgba(255, 255, 255, 0.34);
    background: var(--brown);
    color: #ffffff;
    transform: translateY(-7px);
    box-shadow:
      0 34px 60px rgba(0, 0, 0, 0.34),
      14px 18px 28px rgba(0, 0, 0, 0.20),
      0 0 0 6px rgba(29, 36, 51, 0.07);
  }

  .mag-aside .mag-note.blue {
    background: var(--cobalt);
  }

  .mag-aside .mag-note.teal {
    background: var(--teal);
  }

  .mag-aside .mag-note.amber {
    background: var(--amber);
  }

  .mag-aside .mag-note.rose {
    background: var(--rose);
  }

  .mag-aside .mag-note.violet {
    background: var(--violet);
  }

  .mag-aside .mag-note strong,
  .mag-aside .mag-note p {
    color: #ffffff;
  }

  .mag-aside .mag-icon {
    border-color: rgba(255, 255, 255, 0.44);
    background: rgba(255, 255, 255, 0.16);
    color: #ffffff;
  }

  .mag-icon {
    width: 2.4rem;
    height: 2.4rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--cream);
    color: #111827;
    font-size: 1.08rem;
    line-height: 1;
  }

  .mag-icon.bulb::before {
    content: "\1F4A1";
  }

  .mag-icon.gear::before {
    content: "\2699";
  }

  .mag-icon.question::before {
    content: "?";
    font-weight: 950;
  }

  .mag-icon.memory::before {
    content: "\25A3";
  }

  .mag-icon.route::before {
    content: "\2192";
    font-weight: 950;
  }

  .mag-icon.warning::before {
    content: "!";
    font-weight: 950;
  }

  .mag-compare {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 2rem;
    margin: 1.9rem 0;
  }

  .mag-card {
    padding: 1.45rem;
    border: 1px solid var(--line);
    background: var(--cream);
  }

  .mag-card.blue {
    background: var(--blue-soft);
    border-top: 6px solid var(--cobalt);
  }

  .mag-card.teal {
    background: var(--teal-soft);
    border-top: 6px solid var(--teal);
  }

  .mag-card.amber {
    background: var(--amber-soft);
    border-top: 6px solid var(--amber);
  }

  .mag-card.rose {
    background: var(--rose-soft);
    border-top: 6px solid var(--rose);
  }

  .mag-card.violet {
    background: var(--violet-soft);
    border-top: 6px solid var(--violet);
  }

  .mag-card.strong-blue {
    background: var(--blue-soft);
    border-top: 8px solid var(--cobalt);
  }

  .mag-card.strong-teal {
    background: var(--teal-soft);
    border-top: 8px solid var(--teal);
  }

  .mag-card strong {
    display: block;
    margin-top: 0.18rem;
    color: #111827;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 1.35rem;
    line-height: 1.1;
  }

  .mag-card p {
    margin: 0.55rem 0 0;
    color: #334155;
    font-size: 0.94rem;
    line-height: 1.58;
  }

  .mag-pull {
    margin: 1.35rem 0;
    padding: 1.15rem 1.2rem;
    border-left: 10px solid var(--brown);
    background: #111827;
    color: #ffffff;
    font-family: Georgia, "Times New Roman", serif;
    font-size: clamp(1.35rem, 3vw, 2.1rem);
    font-weight: 900;
    line-height: 1.16;
  }

  .mag-pull.light {
    border-left-color: var(--teal);
    background: var(--cream);
    color: #111827;
  }

  .mag-pull.mag-pull-small {
    font-size: 1.1rem;
    line-height: 1.35;
    padding: 0.85rem 1rem;
  }

  .mag-pull.light.mag-pull-small {
    font-size: 1.18rem;
  }

  .mag-pull.mag-pull-question {
    font-size: 1rem;
    line-height: 1.35;
    padding: 0.85rem 1rem;
    font-weight: 800;
  }

  .mag-horizontal-rail {
    margin: 0.4rem 0 1rem;
    padding: 0.75rem 1rem;
    border-top: 8px solid rgba(255, 255, 255, 0.34);
    background: var(--rose);
    color: #ffffff;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 1.08rem;
    font-weight: 900;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .mag-emphasis-line {
    display: block;
    margin: 1rem 0 0.7rem;
    color: #111827;
    font-family: Georgia, "Times New Roman", serif;
    font-style: italic;
    font-weight: 800;
    font-size: 1.08rem;
    line-height: 1.45;
    text-shadow:
      -2px 2px 0 rgba(63, 71, 56, 0.18),
      -1px 1px 0 rgba(114, 65, 38, 0.14);
  }

  .mag-emphasis-line.mag-emphasis-question {
    font-size: 1.22rem;
  }

  .mag-step-chain {
    display: grid;
    grid-template-columns: repeat(11, auto);
    align-items: stretch;
    gap: 0.35rem;
    margin: 1.2rem 0;
    padding: 0.95rem;
    border: 1px solid var(--line);
    background: linear-gradient(135deg, var(--paper), var(--blue-soft) 55%, var(--teal-soft));
    overflow-x: auto;
  }

  .mag-step {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 104px;
    min-height: 64px;
    padding: 0.65rem 0.75rem;
    border: 1px solid rgba(29, 36, 51, 0.16);
    border-top: 7px solid var(--cobalt);
    background: var(--cream);
    color: #111827;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 1.04rem;
    font-weight: 900;
    line-height: 1.05;
    text-transform: uppercase;
    text-align: center;
    box-shadow: 0 12px 24px rgba(29, 36, 51, 0.10);
  }

  .mag-step.ffn {
    border-top-color: var(--teal);
    background: var(--teal-soft);
  }

  .mag-step.prefill {
    border-top-color: var(--amber);
    background: var(--amber-soft);
  }

  .mag-step.decode {
    border-top-color: var(--rose);
    background: var(--rose-soft);
  }

  .mag-step.response {
    border-top-color: var(--violet);
    background: var(--violet-soft);
  }

  .mag-step-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 38px;
    min-height: 64px;
    background: var(--brown);
    color: #ffffff;
    font-size: 1.25rem;
    font-weight: 950;
    line-height: 1;
    clip-path: polygon(0 0, 76% 0, 100% 50%, 76% 100%, 0 100%, 20% 50%);
  }

  @media (max-width: 620px) {
    .mag-step-chain {
      grid-template-columns: repeat(11, max-content);
      padding: 0.75rem;
    }

    .mag-step {
      min-width: 92px;
      min-height: 56px;
      font-size: 0.9rem;
    }

    .mag-step-arrow {
      min-height: 56px;
    }
  }

  .mag-note .mag-step-chain {
    margin: 0.5rem 0 0;
    padding: 0.6rem;
    background: rgba(255, 255, 255, 0.72);
  }

  .mag-note .mag-step {
    min-width: 82px;
    min-height: 46px;
    font-size: 0.78rem;
  }

  .mag-note .mag-step-arrow {
    min-width: 28px;
    min-height: 46px;
    font-size: 0.95rem;
  }

  .mag-calc {
    display: grid;
    gap: 0.65rem;
    margin: 1.1rem 0;
  }

  .mag-calc-row {
    padding: 0.9rem 1rem;
    background: var(--brown);
    color: #ffffff;
    font-family: Georgia, "Times New Roman", serif;
    font-size: clamp(1.2rem, 3vw, 2rem);
    font-weight: 900;
    line-height: 1.2;
  }

  .mag-calc.blue .mag-calc-row {
    background: var(--cobalt);
    font-size: 1.1rem;
    line-height: 1.3;
  }

  .mag-list-panel {
    margin: 1rem 0;
    padding: 1rem;
    border: 1px solid var(--line);
    background: var(--cream);
  }

  .mag-list-panel p {
    margin: 0.25rem 0;
    font-weight: 800;
  }

  .mag-end {
    margin: 2rem 0 0;
    padding: 1.2rem 1.3rem;
    border: 1px solid var(--line);
    border-top: 8px solid var(--brown);
    background: var(--cream);
  }

  .mag-end p {
    margin: 0;
    color: #111827;
    font-family: Georgia, "Times New Roman", serif;
    font-size: clamp(1.28rem, 3vw, 1.9rem);
    font-weight: 900;
    line-height: 1.22;
  }

  .mag-end .mag-end-small {
    font-size: 1rem;
    font-weight: 600;
    line-height: 1.45;
  }

  @media (max-width: 980px) {
    .llm-mag {
      padding: 0 1.4rem 1.8rem;
    }

    .mag-hero {
      grid-template-columns: 140px minmax(0, 1fr);
    }

    .mag-hero-side {
      grid-column: 1 / -1;
    }

    .mag-side-list {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .mag-body-grid,
    .mag-compare {
      grid-template-columns: 1fr;
    }

    .mag-aside {
      position: static;
    }
  }

  @media (max-width: 620px) {
    .llm-mag {
      padding: 0 0.8rem 1.2rem;
    }

    .mag-hero {
      grid-template-columns: 1fr;
      min-height: auto;
    }

    .mag-rail span {
      writing-mode: horizontal-tb;
      transform: none;
      font-size: 2rem;
    }

    .mag-hero-main {
      padding: 1.25rem;
    }

    .mag-side-list {
      grid-template-columns: 1fr;
    }

    .mag-opener {
      grid-template-columns: 1fr;
    }

    .mag-number {
      min-height: auto;
      justify-content: flex-start;
      padding: 0.75rem 1rem;
    }

    .mag-note {
      grid-template-columns: 1fr;
    }

    .mag-section-split {
      grid-template-columns: 1fr;
    }

  }
</style>

<article class="llm-mag" markdown="1">

<header class="mag-hero">
  <div class="mag-rail"><span>LLM Inference</span></div>
  <div class="mag-hero-main">
    <div class="mag-kicker">Inside Modern LLM Inference</div>
    <h1>What Really Happens Before Frontier Models Answer?</h1>
    <p class="mag-lead">You type a prompt, wait for a brief moment, and words begin to appear. The visible experience feels simple, but before the first token arrives the model has already read the prompt, built internal representations, created KV cache entries, and prepared the decode loop.</p>
  </div>
  <aside class="mag-hero-side">
    <div>
      <div class="mag-side-title">Attention, FFN, Prefill, Decode, KV Cache</div>
      <div class="mag-side-list">
        <span>Memory Bandwidth</span>
        <span>Agentic AI</span>
        <span>Mixture of Experts</span>
        <span>REAP</span>
      </div>
    </div>
  </aside>
</header>

<div class="mag-intro" markdown="1">

Every day, millions of people ask frontier models questions. Some ask them to summarize documents, some use them to write code, and others use them to solve complex problems. Regardless of the question, the experience feels almost magical. You type a prompt, wait for a brief moment, and words begin to appear on the screen.

But have you ever wondered what happens during that pause before the first token appears?

Is the model already generating an answer? Is it reasoning? Or is something entirely different happening behind the scenes?

As I began exploring Large Language Models, or LLMs, I discovered that many of the concepts we casually mention - Attention, FFN, Prefill, Decode, KV Cache, Memory Bandwidth, and Mixture of Experts - are deeply connected. Understanding one naturally leads to questions about the next.

Let's open that Pandora's box, one layer at a time.

</div>

<section class="mag-section" markdown="1">

<div class="mag-opener blue">
  <div class="mag-number">01</div>
  <div class="mag-opener-body">
    <div class="mag-section-tag">The First Mystery</div>
    <h2>Where Does Understanding Happen?</h2>
  </div>
</div>

<div class="mag-section-split">
  <div class="mag-section-split-main" markdown="1">

When people first learn about transformers, they quickly encounter two terms:

- Attention
- Feed-Forward Network, or FFN

<p class="mag-emphasis-line">At first glance, it is tempting to think that attention is where all the intelligence resides. After all, attention determines which tokens are related to one another.</p>

Consider the sentence:

> The animal did not cross the road because it was tired.

How does the model know that *it* refers to *the animal* and not *the road*?

This is where attention shines. Attention allows tokens to discover relationships with other tokens. It helps the model determine which parts of the prompt are relevant to the current token being processed.

But this creates another question.

<p class="mag-emphasis-line">If attention merely identifies relevant information, where does the actual thinking happen?</p>

  </div>
  <aside class="mag-section-split-side">
    <div class="mag-note">
      <span class="mag-icon bulb" aria-hidden="true"></span>
      <div>
        <strong>A useful mental model</strong>
        <p>Imagine a student solving an exam question. The student begins by searching through textbooks, notes, and reference material to find information relevant to the question. Attention plays a similar role.</p>
      </div>
    </div>
  </aside>
</div>


</section>

<section class="mag-section" markdown="1">

<div class="mag-opener teal">
  <div class="mag-number">02</div>
  <div class="mag-opener-body">
    <div class="mag-section-tag">If Attention Retrieves Information</div>
    <h2>What Does the FFN Do?</h2>
  </div>
</div>

Refer to same mental model that we talked about in previous section. Once the student has found the relevant pages in a textbook, the real work begins. The student reads, interprets, compares ideas, connects concepts, and develops understanding.

This is where the Feed-Forward Network enters the picture.

In an oversimplified but surprisingly useful mental model:

<div class="mag-compare">
  <div class="mag-card strong-blue">
    <div class="mag-label">Attention</div>
    <strong>Retrieves</strong>
    <p>Attention retrieves contextual information and identifies relationships between different pieces of information.</p>
  </div>
  <div class="mag-card strong-teal">
    <div class="mag-label">FFN</div>
    <strong>Computes</strong>
    <p>The FFN takes the contextual information gathered by attention and transforms it into richer internal representations.</p>
  </div>
</div>

The FFN takes the contextual information gathered by attention and transforms it into richer internal representations.

<b>Without attention</b>, the model would not know where to look. And <b>without the FFN</b>, the model would know where to look but would struggle to make meaningful use of the information.

Of course, reality is more nuanced than this simple description. Reasoning does not magically happen inside a single FFN layer. Instead, reasoning emerges from repeated cycles across many transformer layers as below.

<div class="mag-step-chain" aria-label="Repeated attention and FFN cycle">
  <span class="mag-step">Attention</span>
  <span class="mag-step-arrow">-&gt;</span>
  <span class="mag-step ffn">FFN</span>
  <span class="mag-step-arrow">-&gt;</span>
  <span class="mag-step">Attention</span>
  <span class="mag-step-arrow">-&gt;</span>
  <span class="mag-step ffn">FFN</span>
  <span class="mag-step-arrow">-&gt;</span>
  <span class="mag-step">Attention</span>
  <span class="mag-step-arrow">-&gt;</span>
  <span class="mag-step ffn">FFN</span>
</div>

Each layer refines the representation a little further. Individually, the layers appear simple. Collectively, they produce behavior that looks remarkably like reasoning. Understanding this is important because it leads us to the next question.

<p class="mag-emphasis-line">If the model is constantly processing information internally, what exactly happens after we submit a prompt?</p>

</section>

<section class="mag-section" markdown="1">

<div class="mag-opener blue">
  <div class="mag-number">03</div>
  <div class="mag-opener-body">
    <div class="mag-section-tag">Before The First Token</div>
    <h2>What Happens Before the First Token Appears?</h2>
  </div>
</div>

<div class="mag-section-split">
  <div class="mag-section-split-main" markdown="1">

Most people imagine that a frontier model starts generating an answer immediately after receiving a prompt.

Surprisingly, it doesn't.

Before a single word appears on the screen, the model has already performed a significant amount of work. It has read the entire prompt, established relationships between tokens, processed those relationships through multiple transformer layers, and built the internal representations required for generation.

This hidden stage is known as **Prefill**.

You can think of it as the model's reading phase.

Imagine a student sitting in an examination hall. Before writing an answer, the student first reads the entire question, understands what is being asked, identifies relevant concepts, and formulates an approach.

That is exactly what prefill does. At the end of prefill, the model understands the prompt. Yet nothing has appeared on the screen. The model has completed its internal preparation, but it has not started writing the answer.

  </div>
  <aside class="mag-section-split-side">
    <div class="mag-note">
      <span class="mag-icon gear" aria-hidden="true"></span>
      <div>
        <strong>During prefill</strong>
        <p>Attention runs across the prompt. FFN layers process the resulting representations. KV cache entries are created. Final hidden representations are computed.</p>
      </div>
    </div>
  </aside>
</div>

</section>

<section class="mag-section" markdown="1">

<div class="mag-opener rose">
  <div class="mag-number">04</div>
  <div class="mag-opener-body">
    <div class="mag-section-tag">Autoregressive Generation</div>
    <h2>Why Doesn't the Model Generate the Entire Answer at Once?</h2>
  </div>
</div>

<p class="mag-emphasis-line">If the model already understands the prompt, why not simply produce the entire answer immediately?</p>

The answer lies in how autoregressive language models work. LLMs generate text one token at a time. After prefill, the model predicts the most likely next token. Then it predicts the token after that. And then the next one.

This stage is called **Decode**.

<div class="mag-compare">
  <div class="mag-card amber">
    <div class="mag-label">Prefill</div>
    <strong>Understanding</strong>
    <p>If prefill is equivalent to reading the question paper, decode is equivalent to writing the answer.</p>
  </div>
  <div class="mag-card blue">
    <div class="mag-label">Decode</div>
    <strong>Generation</strong>
    <p>After prefill, the model predicts the most likely next token. Then it predicts the token after that.</p>
  </div>
</div>

The distinction is subtle but important.

Prefill focuses on understanding. And Decode focuses on generation.

And that leads to another interesting question.

<p class="mag-emphasis-line">If the model generates tokens one at a time, does it have to re-read the entire prompt every time a new token is generated?</p>

Fortunately, the answer is no.

</section>

<section class="mag-section" markdown="1">

<div class="mag-opener teal">
  <div class="mag-number">05</div>
  <div class="mag-opener-body">
    <div class="mag-section-tag">The Hidden Hero</div>
    <h2>KV Cache</h2>
  </div>
</div>

<div class="mag-section-split">
  <div class="mag-section-split-main" markdown="1">

Without optimization, token generation would be painfully inefficient.

Imagine generating token number 1001 after processing a 1000-token prompt.

Without some form of caching, the model would need to recompute attention for all previous tokens every time a new token was generated. That would be extraordinarily expensive. To avoid this, transformers create something called a **KV Cache** during prefill. The cache stores previously computed Keys and Values, allowing future tokens to reuse earlier computations. As a result, the model no longer needs to repeatedly rebuild the entire attention history. This dramatically improves performance.

However, many people stop here and draw the wrong conclusion.

<div class="mag-note rose">
  <span class="mag-icon warning" aria-hidden="true"></span>
  <div>
    <strong>The wrong conclusion</strong>
    <p>They assume that KV cache solves the inference problem entirely. It doesn't. It solves one problem, but another still remains.</p>
  </div>
</div>

  </div>
  <aside class="mag-section-split-side">
    <div class="mag-note teal">
      <span class="mag-icon memory" aria-hidden="true"></span>
      <div>
        <strong>KV Cache</strong>
        <p>The cache stores previously computed Keys and Values, allowing future tokens to reuse earlier computations.</p>
      </div>
    </div>
  </aside>
</div>

</section>

<section class="mag-section" markdown="1">

<div class="mag-opener violet">
  <div class="mag-number">06</div>
  <div class="mag-opener-body">
    <div class="mag-section-tag">KV Cache Pressure</div>
    <h2>If KV Cache Is So Useful, Why Not Store It Forever?</h2>
  </div>
</div>

<div class="mag-section-split">
  <div class="mag-section-split-main" markdown="1">

At this point, KV cache sounds like a perfect solution. The model computes Keys and Values once during prefill and then simply reuses them during decode. However, every optimization introduces a new challenge.

As context windows grow larger, KV cache size grows as well.

For short conversations this is rarely a concern. However, in long-running conversations, RAG workflows, and agentic systems that continuously accumulate context, the KV cache can consume a significant amount of GPU memory. In some scenarios, the memory required for the KV cache may rival or even exceed the memory consumed by the model weights themselves.

  </div>
  <aside class="mag-section-split-side">
    <div class="mag-note violet">
      <span class="mag-icon memory" aria-hidden="true"></span>
      <div>
        <strong>Cache size grows</strong>
        <p>As context windows grow larger, KV cache size grows as well.</p>
      </div>
    </div>
  </aside>
</div>

Naturally, engineers began asking another question:

<div class="mag-pull mag-pull-question">Can we compress the KV cache without significantly affecting model quality?</div>

<div class="mag-text-columns" markdown="1">

This led to a growing area of research focused on KV-cache quantization and compression techniques.

One example is TurboQuant, which attempts to reduce the memory footprint of the KV cache while preserving model quality. The goal is not merely to save memory, but also to improve inference efficiency by reducing memory traffic and increasing the effective context that can fit within GPU memory.

However, KV-cache optimization is not a one-size-fits-all problem.

Different model architectures respond differently to cache compression techniques. Some approaches significantly improve decode performance but introduce overhead during prefill. Others provide modest gains across both phases. In practice, selecting the right optimization often depends on the model architecture, workload characteristics, context length, and latency requirements.

As with most engineering problems, there is no universal winner. The best solution depends on what is being optimized.

</div>

<div class="mag-thin-bar"></div>

### Not All KV Cache Data Is Equally Sensitive

An interesting observation from recent research is that Keys and Values behave differently under quantization.

<p class="mag-emphasis-line">At first glance, it may seem reasonable to compress both equally. In reality, they play different roles inside the attention mechanism.</p>

Keys are heavily involved in determining attention scores. Small errors in the Key tensors can alter which tokens receive attention and by how much, potentially affecting model accuracy.

Values, on the other hand, are used after the attention weights have already been determined. As a result, Value tensors often tolerate more aggressive compression.

<div class="mag-compare">
  <div class="mag-card strong-blue">
    <div class="mag-label">Keys</div>
    <strong>Where to look</strong>
    <p>Keys are heavily involved in determining attention scores.</p>
  </div>
  <div class="mag-card strong-teal">
    <div class="mag-label">Values</div>
    <strong>What information is retrieved</strong>
    <p>Values are used after the attention weights have already been determined.</p>
  </div>
</div>

A useful way to think about this is:

- Keys help determine where to look.
- Values help determine what information is retrieved.

<div class="mag-thin-bar"></div>

<div class="mag-text-columns" markdown="1">

Because of this distinction, many KV-cache optimization techniques prioritize preserving Key accuracy while applying more aggressive compression strategies to Values.

Another practical observation is that Value tensors often contain structural patterns that allow memory savings while maintaining the tensor shapes expected by the model. 

Maintaining these shapes is important because the attention mechanism relies on predictable tensor dimensions for efficient execution.

This subtle difference between Keys and Values is one reason KV-cache optimization remains an active area of research rather than a solved problem.

</div>

</section>

<section class="mag-section" markdown="1">

<div class="mag-opener violet">
  <div class="mag-number">07</div>
  <div class="mag-opener-body">
    <div class="mag-section-tag">Memory Bandwidth</div>
    <h2>If KV Cache Exists, Why Do AI Engineers Obsess Over Memory Bandwidth?</h2>
  </div>
</div>

<div class="mag-section-split">
  <div class="mag-section-split-main" markdown="1">

At this point, a natural question arises.

If the model already understands the prompt and can reuse previous attention computations through KV cache then : <p class="mag-emphasis-line">Why does inference still require such powerful hardware?</p>

<p class="mag-emphasis-line">Why are AI engineers constantly talking about HBM, GPU memory bandwidth, and specialized accelerators?</p>

The answer lies in a distinction that is easy to overlook. KV cache reduces attention recomputation. It does **not** eliminate the need to read model weights. Every layer still requires access to its parameters. And modern LLMs contain an enormous number of parameters.

To understand why this matters, we need to look inside the GPU.

  </div>
  <aside class="mag-section-split-side">
    <div class="mag-note violet">
      <span class="mag-icon warning" aria-hidden="true"></span>
      <div>
        <strong>Easy to overlook</strong>
        <p>KV cache reduces attention recomputation. It does not eliminate the need to read model weights.</p>
      </div>
    </div>
  </aside>
</div>

</section>

<section class="mag-section" markdown="1">

<div class="mag-opener violet">
  <div class="mag-number">08</div>
  <div class="mag-opener-body">
    <div class="mag-section-tag">Inside The GPU</div>
    <h2>Understanding GPU Memory Bandwidth</h2>
  </div>
</div>

<div class="mag-section-split">
  <div class="mag-section-split-main" markdown="1">

When people discuss memory bandwidth in AI systems, they are usually referring to bandwidth inside the GPU, not PCIe bandwidth between the CPU and GPU.

A simplified view looks like this:

<div class="mag-list-panel">
  <p>HBM Memory</p>
  <p>L2 Cache</p>
  <p>Registers</p>
  <p>Tensor Cores</p>
</div>

The tensor cores are the computational engines of the GPU.

They continuously request:

- Model weights
- Activations
- KV cache data

Think of tensor cores as workers on a factory floor. The workers can process materials extremely quickly, but only if the materials arrive on time. If the supply chain cannot keep up, workers sit idle.

Similarly, if data cannot be delivered from memory fast enough, tensor cores remain underutilized. This is why memory bandwidth has become such an important design parameter in modern AI hardware.

<p class="mag-emphasis-line">But where does this bandwidth actually go?</p>

A simple calculation helps answer that question.

  </div>
  <aside class="mag-section-split-side">
    <div class="mag-note violet">
      <span class="mag-icon gear" aria-hidden="true"></span>
      <div>
        <strong>Model weights, activations, KV cache data</strong>
        <p>The tensor cores continuously request all three.</p>
      </div>
    </div>
  </aside>
</div>

</section>

<section class="mag-section" markdown="1">

<div class="mag-opener blue">
  <div class="mag-number">09</div>
  <div class="mag-opener-body">
    <div class="mag-section-tag">A Rough 70B Model Calculation</div>
    <h2>A Rough 70B Model Calculation</h2>
  </div>
</div>

<div class="mag-section-split">
  <div class="mag-section-split-main" markdown="1">

Consider a 70-billion-parameter model.

Assuming FP16 precision, each parameter occupies approximately 2 bytes.

That means:

<div class="mag-calc blue">
  <div class="mag-calc-row">70 billion x 2 bytes ~= 140 GB</div>
</div>

of model weights.

Now suppose the model generates roughly 20 tokens per second.

A rough estimate suggests:

<div class="mag-calc blue">
  <div class="mag-calc-row">140 GB x 20 ~= 2.8 TB/s</div>
</div>

This is not a precise calculation, but it provides useful intuition.

Suddenly, the enormous bandwidth numbers associated with modern AI GPUs begin to make sense.

And this observation becomes even more important when we move beyond traditional chatbots.

  </div>
  <aside class="mag-section-split-side">
    <div class="mag-note blue">
      <span class="mag-icon gear" aria-hidden="true"></span>
      <div>
        <strong>The challenge</strong>
        <p>The challenge is no longer just performing computation. The challenge is moving vast quantities of data quickly enough to keep the compute units busy.</p>
      </div>
    </div>
  </aside>
</div>

</section>

<section class="mag-section" markdown="1">

<div class="mag-opener blue">
  <div class="mag-number">10</div>
  <div class="mag-opener-body">
    <div class="mag-section-tag">Agentic AI</div>
    <h2>Why Agentic AI Changes the Equation</h2>
  </div>
</div>

<div class="mag-section-split">
  <div class="mag-section-split-main" markdown="1">

A traditional chatbot usually follows a simple pattern:

<div class="mag-note">
  <span class="mag-icon route" aria-hidden="true"></span>
  <div>
    <strong>Traditional chatbot</strong>
    <div class="mag-step-chain" aria-label="Traditional chatbot loop">
      <span class="mag-step">Prompt</span>
      <span class="mag-step-arrow">-&gt;</span>
      <span class="mag-step prefill">Prefill</span>
      <span class="mag-step-arrow">-&gt;</span>
      <span class="mag-step decode">Decode</span>
      <span class="mag-step-arrow">-&gt;</span>
      <span class="mag-step response">Response</span>
    </div>
  </div>
</div>

<div class="mag-text-columns" markdown="1">

Agentic systems are different.

An agent may:

- Search documents
- Call tools
- Retrieve knowledge
- Consult memory
- Build new prompts
- Re-enter the inference cycle repeatedly

Each cycle introduces additional prompt processing.

As a result, modern agentic workloads often spend a significant amount of time reading and processing context. This makes prompt processing efficiency, KV-cache management, and memory bandwidth even more important.

And naturally, this leads to the next question.

</div>

  </div>
  <aside class="mag-section-split-side">
    <div class="mag-note blue">
      <span class="mag-icon route" aria-hidden="true"></span>
      <div>
        <strong>Agentic workloads</strong>
        <p>In many scenarios, the system spends more effort understanding information than generating new text.</p>
      </div>
    </div>
  </aside>
</div>

</section>



<section class="mag-section" markdown="1">

<div class="mag-opener teal">
  <div class="mag-number">11</div>
  <div class="mag-opener-body">
    <div class="mag-section-tag">KV Cache Reuse</div>
    <h2>If We Already Computed the KV Cache, Why Compute It Again?</h2>
  </div>
</div>

<div class="mag-section-split">
  <div class="mag-section-split-main" markdown="1">

<div class="mag-text-columns" markdown="1">

At this point, cache reuse sounds straightforward. If the prompt remains unchanged, reuse the KV cache and avoid repeating prefill. However, agentic systems introduce a complication.

An agent rarely performs a single inference pass. Instead, it continuously alternates between reasoning and action.

A typical workflow may look like:

- User Request
- Reasoning
- Tool Call
- Tool Result
- Reasoning
- Another Tool Call
- Updated Context

After every tool call, new information is added to the context window.

<p class="mag-emphasis-line">At first glance, this appears to invalidate the entire KV cache.</p>

<p class="mag-emphasis-line">If the prompt has changed, shouldn't the model be forced to rebuild everything from scratch?</p>

Fortunately, modern inference systems can often do better. Rather than treating the KV cache as a single monolithic object, it can be divided into reusable segments or chunks.

</div>
<div class="mag-thin-bar"></div>
Consider a simplified example:

<div class="mag-list-panel">
  <p>Chunk A: System Prompt</p>
  <p>Chunk B: User Request</p>
  <p>Chunk C: Previous Reasoning</p>
  <p>Chunk D: Tool Output</p>
  <p>Chunk E: Current Reasoning</p>
</div>

<div class="mag-text-columns" markdown="1">

Suppose the agent performs another tool call and receives new information.

Only Chunk D changes.

The system can keep the KV cache associated with Chunks A, B, and C while recomputing only the portions affected by the new tool output.

Conceptually, it behaves much like incremental compilation in software development. When a single source file changes, the compiler does not rebuild the entire project. It rebuilds only the components affected by the modification.

KV-cache reuse applies a similar idea to inference.

Instead of repeatedly processing thousands of unchanged tokens, the inference engine reuses previously computed cache entries and rebuilds only the portions that are no longer valid.

This significantly reduces prompt-processing overhead, particularly in agentic workflows where large portions of the context remain unchanged across multiple reasoning steps.

As agents become more sophisticated, cache reuse evolves from a useful optimization into a fundamental requirement. Without it, the same context may be processed dozens of times during a single task, consuming GPU resources without contributing any new information.

</div>

<div class="mag-pull light mag-pull-small">In many real-world deployments, the fastest token is not the one generated more quickly. It is the token whose computation was never repeated in the first place.</div>

  </div>
  <aside class="mag-section-split-side">
    <div class="mag-note teal">
      <span class="mag-icon memory" aria-hidden="true"></span>
      <div>
        <strong>Reusable segments</strong>
        <p>Rather than treating the KV cache as a single monolithic object, it can be divided into reusable segments or chunks.</p>
      </div>
    </div>
  </aside>
</div>

</section>

<section class="mag-section" markdown="1">

<div class="mag-opener teal">
  <div class="mag-number">12</div>
  <div class="mag-opener-body">
    <div class="mag-section-tag">Mixture of Experts</div>
    <h2>Enter Mixture of Experts</h2>
  </div>
</div>

<div class="mag-section-split">
  <div class="mag-section-split-main" markdown="1">

<div class="mag-text-columns" markdown="1">

<p class="mag-emphasis-line">If bandwidth is becoming the bottleneck, why activate the entire model for every token?</p>

This question led researchers toward Mixture of Experts architectures.

In a traditional dense model, every token activates the same FFN layers. Whether the token is simple or complex, the entire model participates.

MoE takes a different approach. Instead of activating every expert, a routing mechanism selects only a small subset of experts for each token. This reduces the number of active parameters.

<p class="mag-emphasis-line">But notice something interesting.</p>

When discussing MoE, people usually talk about expert FFN layers, not expert attention layers.

<p class="mag-emphasis-line mag-emphasis-question">Why?</p>

Because most transformer parameters reside inside FFN layers.

Attention is essential for communication between tokens and typically remains dense.

FFN layers, on the other hand, account for the majority of parameters and are therefore the most attractive target for selective activation.

</div>

<div class="mag-compare">
  <div class="mag-card blue">
    <div class="mag-label">Traditional dense model</div>
    <strong>Every token activates the same FFN layers</strong>
    <p>Whether the token is simple or complex, the entire model participates.</p>
  </div>
  <div class="mag-card teal">
    <div class="mag-label">MoE</div>
    <strong>A routing mechanism selects only a small subset of experts</strong>
    <p>Total parameters can become very large. Active parameters remain relatively small.</p>
  </div>
</div>

<p>As a result:</p>

<ul>
  <li>Total parameters can become very large.</li>
  <li>Active parameters remain relatively small.</li>
  <li>Memory traffic is reduced.</li>
  <li>Inference becomes more efficient.</li>
</ul>

  </div>
  <aside class="mag-section-split-side">
    <div class="mag-note teal">
      <span class="mag-icon gear" aria-hidden="true"></span>
      <div>
        <strong>MoE economics</strong>
        <p>The industry did not adopt MoE because it was fashionable. It adopted MoE because the economics of large-scale inference demanded it.</p>
      </div>
    </div>
  </aside>
</div>

</section>

<section class="mag-section" markdown="1">

<div class="mag-opener rose">
  <div class="mag-number">13</div>
  <div class="mag-opener-body">
    <div class="mag-section-tag">Expert Memory</div>
    <h2>If Only a Few Experts Are Active, Why Keep All Experts in GPU Memory?</h2>
  </div>
</div>

<div class="mag-section-split">
  <div class="mag-section-split-main" markdown="1">

<div class="mag-text-columns" markdown="1">

<p class="mag-emphasis-line">At first glance, Mixture of Experts appears to solve the inference problem elegantly.</p>

For any given token, only a small subset of experts is activated. If only a few experts are needed, one might assume that memory requirements would shrink proportionally.

<p class="mag-emphasis-line">Unfortunately, the reality is more complicated.</p>

Although only a small number of experts are active for each token, the system must still keep the entire expert pool available. In large MoE models, the combined size of all experts can become enormous, often exceeding the memory capacity of a single GPU.

One common solution is expert offloading.

Frequently used experts remain in GPU memory, while less frequently used experts are stored in system memory, or RAM, and loaded when required.

While this approach reduces GPU memory requirements, it introduces a new bottleneck.

The moment an expert must be fetched from host memory, data must travel across PCIe. Compared to GPU HBM bandwidth, PCIe is significantly slower.

A modern AI GPU may provide several terabytes per second of HBM bandwidth, while PCIe bandwidth is typically measured in tens of gigabytes per second.

As a result, an expert that resides in RAM may introduce noticeable latency whenever it is activated.

<p class="mag-emphasis-line">This naturally raises another question:</p>

If certain experts are rarely used, do we really need to keep them at all?

This idea motivates techniques such as REAP.

</div>

  </div>
  <aside class="mag-section-split-side">
    <div class="mag-note rose">
      <span class="mag-icon memory" aria-hidden="true"></span>
      <div>
        <strong>Expert offloading</strong>
        <p>Frequently used experts remain in GPU memory, while less frequently used experts are stored in system memory, or RAM, and loaded when required.</p>
        <p>That matters because the moment an expert must be fetched from host memory, data must travel across PCIe. Compared to GPU HBM bandwidth, PCIe is significantly slower.</p>
      </div>
    </div>
  </aside>
</div>

<div class="mag-horizontal-rail">REAP: Keeping the Experts That Matter</div>

<div class="mag-text-columns" markdown="1">

REAP focuses on identifying experts that contribute little to real-world inference workloads and removing them from the model.

<p class="mag-emphasis-line">The intuition is straightforward.</p>

In many deployments, expert utilization is highly uneven. Some experts are selected frequently, while others may be activated only rarely.

If a subset of experts contributes minimally to model behavior, retaining them consumes memory without providing proportional value.

By pruning underutilized experts, REAP reduces the overall size of the MoE model.

<p class="mag-emphasis-line">This creates two important benefits.</p>

First, more of the model can fit directly inside GPU memory, reducing dependence on PCIe transfers and expert offloading.

Second, the reduced memory footprint allows the remaining experts to be served more efficiently, improving overall inference performance.

<p class="mag-emphasis-line">From an infrastructure perspective, the goal is not simply to make the model smaller.</p>

The goal is to maximize the amount of useful model capacity that can remain inside high-bandwidth GPU memory, where it can be accessed at HBM speeds rather than PCIe speeds.

</div>

<p>In many ways, REAP extends the same philosophy we encountered earlier with KV-cache optimization and cache reuse:</p>

<div class="mag-pull mag-pull-small">the fastest data movement is the data movement that never needs to happen.</div>

</section>

<section class="mag-section" markdown="1">

<div class="mag-opener blue">
  <div class="mag-number">14</div>
  <div class="mag-opener-body">
    <div class="mag-section-tag">Bringing It All Together</div>
    <h2>Bringing It All Together</h2>
  </div>
</div>

<div class="mag-text-columns" markdown="1">

What started as a simple question - "What happens before a frontier model answers?" - eventually led us through the most important concepts in modern LLM inference.

We discovered that attention helps tokens find relevant information, while FFN layers transform that information into richer representations.

We saw that reasoning emerges from many rounds of interaction between these components rather than from a single layer.

We learned that before a model generates its first token, it spends time understanding the prompt during prefill.

We explored why decode works differently, why KV cache exists, and why memory bandwidth has become such a critical resource.

We saw how agentic AI amplifies these challenges and why architectures such as Mixture of Experts have become increasingly important.

<p class="mag-emphasis-line">Most importantly, we learned that inference is not simply about generating text.</p>

Long before the first token appears on the screen, the model has already performed a remarkable amount of work.

</div>

<div class="mag-end">
  <p class="mag-end-small">The answer begins much earlier than most people realize.</p>
</div>

</section>

</article>
