---
layout: post
title: "Network for AI Data Center"
date: 2026-05-16
description: "A guide-style comparison of AI data center traffic patterns, remediation techniques, and terminology versus traditional data center networking."
excerpt: "A practical guide to the shift from traditional data center networking to AI data center fabrics, covering incast, elephant flows, topology, GPU-to-GPU communication, RoCEv2, and InfiniBand."
categories: [AI, Networking, Data Center]
tags:
  - ai-data-center
  - data-center-networking
  - gpu-networking
  - cisco
  - nvidia
  - roce
  - infiniband
  - ethernet
  - traffic-engineering
img: Ai-dc.png
---

For many years, the data center network was built for application traffic. Web servers talked to app servers, app servers talked to databases, storage traffic moved in the background, and most flows were independent. Some flows were large and many were small, but the network could usually rely on familiar tools: buffering, TCP backoff, retransmission, ECMP, QoS, and a reasonably oversubscribed leaf-spine fabric.

That design worked because the application was usually above the network. If one flow slowed down, the impact was often local. A user request might take longer, a database call might retry, or a file transfer might finish a little later. The network mattered, but it was not usually part of a tightly synchronized compute loop.

AI changes the relationship. In a training cluster, the GPUs compute for a while and then communicate together. Gradients, activations, or tensor data move across the fabric in repeated phases, and those phases can involve hundreds or thousands of GPUs at the same time. The job behaves less like a collection of servers and more like one distributed machine. When one path slows down, the cost is not just a delayed packet; it can be idle GPU time across the job.

Inference creates a different version of the same problem. A small model served from one GPU may look like a traditional application, but modern large-model inference often spans multiple GPUs or multiple nodes. Tensor parallelism, pipeline parallelism, retrieval, KV-cache movement, batching, and high fan-out service calls can make the network visible to the user as latency. In training, a bad network wastes expensive compute. In inference, a bad network shows up as slow tokens, high tail latency, and lower request throughput.

That is the shift to AI data center networking. The goal is no longer only to connect servers reliably. The goal is to keep GPUs busy during training and keep inference latency predictable, while handling traffic that is synchronized, bursty, bandwidth-heavy, and much less tolerant of packet loss.

The visual comparison below captures where the behavior changes and why AI fabrics need different remediation techniques.

<style>
  .dc-visual {
    --ink: #182033;
    --muted: #5b6478;
    --line: rgba(24, 32, 51, 0.12);
    --panel: #ffffff;
    --ai: #6d28d9;
    --ai-soft: #f3e8ff;
    --ai-mid: #c4b5fd;
    --normal: #0f766e;
    --normal-soft: #d9f99d;
    --normal-mid: #99f6e4;
    --tech: #2563eb;
    --tech-soft: #dbeafe;
    margin: 2rem 0;
    color: var(--ink);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .dc-visual * {
    box-sizing: border-box;
  }

  .dc-visual,
  .dc-visual *,
  .blog-story,
  .blog-story * {
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .dc-hero {
    position: relative;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 22px;
    padding: 1.4rem;
    background:
      radial-gradient(circle at 8% 18%, rgba(109, 40, 217, 0.20), transparent 28%),
      radial-gradient(circle at 88% 10%, rgba(249, 115, 22, 0.20), transparent 26%),
      linear-gradient(135deg, #ffffff 0%, #f8fafc 45%, #eef2ff 100%);
    box-shadow: 0 22px 60px rgba(15, 23, 42, 0.12);
  }

  .dc-kicker {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.38rem 0.7rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.78);
    border: 1px solid rgba(24, 32, 51, 0.10);
    color: #4c1d95;
    font-size: 0.76rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .dc-kicker::before {
    content: "";
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 999px;
    background: linear-gradient(135deg, #7c3aed, #f97316);
    box-shadow: 0 0 0 5px rgba(124, 58, 237, 0.10);
  }

  .dc-hero h2 {
    margin: 1rem 0 0.65rem;
    max-width: 860px;
    color: #111827;
    font-size: clamp(1.65rem, 4vw, 3rem);
    line-height: 1.05;
    letter-spacing: 0;
  }

  .dc-hero p {
    max-width: 920px;
    margin: 0;
    color: #48546a;
    font-size: 1rem;
    line-height: 1.65;
  }

  .dc-stat-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.85rem;
    margin: 1.2rem 0 0;
  }

  .dc-stat {
    min-height: 108px;
    border: 1px solid rgba(24, 32, 51, 0.10);
    border-radius: 16px;
    padding: 0.95rem;
    background: rgba(255, 255, 255, 0.80);
    box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
  }

  .dc-stat strong {
    display: block;
    color: #111827;
    font-size: 1.05rem;
    line-height: 1.2;
  }

  .dc-stat span {
    display: block;
    margin-top: 0.45rem;
    color: var(--muted);
    font-size: 0.86rem;
    line-height: 1.45;
  }

  .dc-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    margin: 1.2rem 0;
  }

  .dc-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    min-height: 34px;
    padding: 0.35rem 0.65rem;
    border-radius: 999px;
    border: 1px solid rgba(24, 32, 51, 0.10);
    background: #fff;
    color: #1f2937;
    font-size: 0.82rem;
    font-weight: 800;
    white-space: nowrap;
  }

  .dc-pill::before {
    content: "";
    width: 0.62rem;
    height: 0.62rem;
    border-radius: 999px;
  }

  .dc-pill-ai::before {
    background: var(--ai);
  }

  .dc-pill-tech::before {
    background: var(--tech);
  }

  .dc-pill-normal::before {
    background: var(--normal);
  }

  .dc-table-card {
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 18px;
    background: var(--panel);
    box-shadow: 0 22px 60px rgba(15, 23, 42, 0.12);
  }

  .dc-table-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .dc-table {
    width: 100%;
    min-width: 1080px;
    border-collapse: separate;
    border-spacing: 0;
    color: var(--ink);
    font-size: 0.88rem;
  }

  .dc-table caption {
    padding: 1rem 1.2rem;
    text-align: left;
    color: #374151;
    font-size: 0.9rem;
    line-height: 1.55;
    background: linear-gradient(90deg, #f8fafc, #ffffff);
    border-bottom: 1px solid var(--line);
  }

  .dc-table th {
    position: sticky;
    top: 0;
    z-index: 4;
    padding: 0.9rem 0.85rem;
    text-align: left;
    color: #ffffff;
    font-size: 0.72rem;
    line-height: 1.15;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    vertical-align: bottom;
    border-right: 1px solid rgba(255, 255, 255, 0.18);
  }

  .dc-table th:first-child {
    left: 0;
    z-index: 5;
    background: #111827;
  }

  .dc-table th.ai-head {
    background: linear-gradient(135deg, #5b21b6, #7c3aed);
  }

  .dc-table th.rem-head {
    background: linear-gradient(135deg, #4338ca, #2563eb);
  }

  .dc-table th.normal-head {
    background: linear-gradient(135deg, #0f766e, #14b8a6);
  }

  .dc-table tbody tr {
    background: #ffffff;
  }

  .dc-table tbody tr:nth-child(even) {
    background: #f8fafc;
  }

  .dc-table tbody tr:hover {
    background: #fff7ed;
  }

  .dc-table td {
    padding: 0.88rem 0.85rem;
    vertical-align: top;
    border-right: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    line-height: 1.45;
  }

  .dc-table td:first-child {
    position: sticky;
    left: 0;
    z-index: 3;
    width: 178px;
    min-width: 178px;
    background: inherit;
    border-right: 1px solid rgba(24, 32, 51, 0.20);
    font-weight: 900;
    color: #111827;
  }

  .dc-table tbody tr:hover td:first-child {
    background: #ffedd5;
  }

  .dc-table td.ai-cell {
    background-image: linear-gradient(90deg, rgba(109, 40, 217, 0.10), transparent 58%);
  }

  .dc-table td.rem-cell {
    background-image: linear-gradient(90deg, rgba(37, 99, 235, 0.09), transparent 58%);
  }

  .dc-table td.normal-cell {
    background-image: linear-gradient(90deg, rgba(20, 184, 166, 0.10), transparent 58%);
  }

  .dc-tagline {
    display: inline-block;
    margin-top: 0.25rem;
    color: #6b7280;
    font-size: 0.76rem;
    font-weight: 700;
  }

  .dc-chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.32rem;
  }

  .dc-chip {
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    padding: 0.22rem 0.48rem;
    border-radius: 999px;
    border: 1px solid rgba(24, 32, 51, 0.10);
    background: #ffffff;
    color: #243047;
    font-size: 0.72rem;
    font-weight: 800;
    line-height: 1.1;
    white-space: nowrap;
  }

  .dc-chip.ai {
    background: var(--ai-soft);
    color: #4c1d95;
  }

  .dc-chip.tech {
    background: var(--tech-soft);
    color: #1d4ed8;
  }

  .dc-chip.normal {
    background: #ccfbf1;
    color: #115e59;
  }

  .blog-story {
    margin: 1.25rem 0 0;
    padding: 0;
    background: transparent;
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }

  .blog-story p {
    margin: 0;
    color: #111827;
    font-size: 1rem;
    line-height: 1.78;
  }

  .blog-story p + p {
    margin-top: 0.9rem;
  }

  .blog-story .story-lead {
    color: #0f172a;
  }

  .blog-story code {
    padding: 0.08rem 0.3rem;
    border: 1px solid #bfdbfe;
    border-radius: 6px;
    background: #eff6ff;
    color: #1d4ed8;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 0.92em;
    font-weight: 800;
    white-space: nowrap;
  }

  .story-mark {
    padding: 0.08rem 0.32rem;
    border-radius: 7px;
    background: #dbeafe;
    color: #1d4ed8;
    font-weight: 800;
  }

  .story-ai {
    color: #6d28d9;
    font-weight: 800;
  }

  .story-net {
    color: #0f766e;
    font-weight: 800;
  }

  .story-green {
    color: #047857;
    font-weight: 800;
  }

  .story-warn {
    color: #c2410c;
    font-weight: 800;
  }

  .story-rule {
    margin-top: 1rem;
    padding: 0.9rem 1rem;
    border-left: 5px solid #7c3aed;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.82);
  }

  .story-note {
    margin: 0.9rem 0;
    padding: 0.85rem 1rem;
    border-left: 5px solid #2563eb;
    border-radius: 14px;
    background: #eff6ff;
  }

  .story-note strong {
    display: block;
    margin-bottom: 0.25rem;
    color: #1d4ed8;
    font-size: 0.95rem;
  }

  .story-note p {
    color: #1e293b;
    font-size: 0.96rem;
    line-height: 1.65;
  }

  .story-list {
    margin: 0.75rem 0 1rem;
    padding-left: 1.25rem;
    color: #111827;
  }

  .story-list li {
    margin: 0.45rem 0;
    line-height: 1.65;
  }

  .fabric-cases {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
    margin: 1.1rem 0 1.2rem;
  }

  .fabric-case {
    border: 1px solid rgba(24, 32, 51, 0.12);
    border-radius: 14px;
    padding: 1rem;
    background: #ffffff;
    box-shadow: 0 12px 30px rgba(15, 23, 42, 0.07);
  }

  .fabric-case h3 {
    margin: 0;
    color: #0f172a;
    font-size: 1rem;
    line-height: 1.3;
  }

  .fabric-case p {
    margin-top: 0.5rem;
    color: #334155;
    font-size: 0.95rem;
    line-height: 1.6;
  }

  .fabric-diagram {
    display: block;
    width: 100%;
    height: auto;
    margin-top: 0.8rem;
    border: 1px solid rgba(24, 32, 51, 0.10);
    border-radius: 10px;
    background: #f8fafc;
  }

  .fabric-link {
    stroke: #cbd5e1;
    stroke-width: 2;
  }

  .fabric-flow {
    fill: none;
    stroke: #16a34a;
    stroke-width: 4;
    stroke-dasharray: 7 7;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .fabric-hot {
    fill: none;
    stroke: #f97316;
    stroke-width: 5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .fabric-switch {
    fill: #1f2937;
  }

  .fabric-switch-text,
  .fabric-label {
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .fabric-switch-text {
    fill: #ffffff;
    font-size: 11px;
    font-weight: 800;
    text-anchor: middle;
  }

  .fabric-label {
    fill: #b45309;
    font-size: 12px;
    font-weight: 800;
  }

  .fabric-host {
    stroke: #111827;
    stroke-width: 2;
  }

  .story-subhead {
    margin: 1.25rem 0 0.6rem;
    color: #0f172a;
    font-size: 1.08rem;
    line-height: 1.35;
  }

  .fabric-choice-wrap {
    overflow-x: auto;
    margin: 0.75rem 0 1.1rem;
    border: 1px solid rgba(24, 32, 51, 0.12);
    border-radius: 12px;
    background: #ffffff;
  }

  .fabric-choice-table {
    width: 100%;
    min-width: 840px;
    border-collapse: collapse;
  }

  .fabric-choice-table th,
  .fabric-choice-table td {
    padding: 0.9rem;
    border-bottom: 1px solid rgba(24, 32, 51, 0.10);
    vertical-align: top;
    text-align: left;
  }

  .fabric-choice-table th {
    background: #f8fafc;
    color: #0f172a;
    font-size: 0.86rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .fabric-choice-table tr:last-child td {
    border-bottom: 0;
  }

  .fabric-choice-table td:first-child {
    width: 18%;
    color: #0f172a;
    font-weight: 800;
  }

  .fabric-choice-table p {
    margin: 0;
    color: #334155;
    font-size: 0.94rem;
    line-height: 1.6;
  }

  @media (max-width: 900px) {
    .dc-hero {
      border-radius: 16px;
      padding: 1rem;
    }

    .dc-stat-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .dc-table-card {
      border-radius: 14px;
    }

    .fabric-cases {
      grid-template-columns: 1fr;
    }

  }

  @media (max-width: 560px) {
    .dc-stat-grid {
      grid-template-columns: 1fr;
    }

    .dc-table {
      min-width: 980px;
      font-size: 0.82rem;
    }

    .dc-table th,
    .dc-table td {
      padding: 0.75rem 0.7rem;
    }
  }
</style>

<section class="dc-visual" aria-label="AI data center traffic comparison">
  <div class="dc-hero">
    <div class="dc-kicker">Traffic Pattern Shift</div>
    <h2>The Shift to AI Data Center Networking: From Independent Flows to GPU Fabrics.</h2>
    <p>Traditional applications can often tolerate independent flows, localized latency, and TCP recovery. AI training clusters are different: synchronized GPU collectives, heavy east-west transfers, microbursts, and low loss tolerance make the network a direct limiter of GPU utilization.</p>
    <div class="dc-stat-grid">
      <div class="dc-stat">
        <strong>Synchronized GPU traffic</strong>
        <span>AI workloads often move in lockstep across thousands of accelerators.</span>
      </div>
      <div class="dc-stat">
        <strong>Lossless transport pressure</strong>
        <span>RoCE, InfiniBand, ECN, and PFC become core design requirement.</span>
      </div>
      <div class="dc-stat">
        <strong>Fabric-aware scheduling</strong>
        <span>Placement, topology, and rail usage affect job completion time.</span>
      </div>
    </div>
  </div>
  <div class="dc-legend" aria-label="Column color legend">
    <span class="dc-pill dc-pill-ai">AI traffic behavior</span>
    <span class="dc-pill dc-pill-tech">Remediation and techniques</span>
    <span class="dc-pill dc-pill-normal">Traditional DC behavior</span>
  </div>
  <div class="dc-table-card">
    <div class="dc-table-scroll">
      <table class="dc-table">
        <caption>
          Comparison of AI data center traffic and normal data center traffic across synchronization, congestion, load balancing, GPU fabric behavior, and remediation techniques.
        </caption>
        <thead>
          <tr>
            <th scope="col">Characteristic</th>
            <th scope="col" class="ai-head">AI Data Center Traffic</th>
            <th scope="col" class="rem-head">AI DC Remediation</th>
            <th scope="col" class="rem-head">AI DC Techniques / Terminology</th>
            <th scope="col" class="normal-head">Normal Data Center Traffic</th>
            <th scope="col" class="normal-head">Normal DC Remediation</th>
            <th scope="col" class="normal-head">Normal DC Techniques</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Synchronization<span class="dc-tagline">Lockstep movement</span></td>
            <td class="ai-cell">Thousands of GPUs communicate together; one slow path or GPU can stall the phase</td>
            <td class="rem-cell">Congestion-aware traffic spreading and locality optimization</td>
            <td class="rem-cell"><div class="dc-chip-row"><span class="dc-chip tech">Adaptive Routing</span><span class="dc-chip tech">Rail Optimization</span><span class="dc-chip tech">Topology-Aware Scheduling</span></div></td>
            <td class="normal-cell">Mostly independent flows</td>
            <td class="normal-cell">Standard load balancing</td>
            <td class="normal-cell"><span class="dc-chip normal">ECMP</span></td>
          </tr>
          <tr>
            <td>Incast<span class="dc-tagline">Many-to-one pressure</span></td>
            <td class="ai-cell">Many senders target one receiver simultaneously</td>
            <td class="rem-cell">Queue protection and early congestion signaling</td>
            <td class="rem-cell"><div class="dc-chip-row"><span class="dc-chip tech">ECN/DCQCN</span><span class="dc-chip tech">PFC</span><span class="dc-chip tech">VOQ</span></div></td>
            <td class="normal-cell">Smaller-scale incast</td>
            <td class="normal-cell">TCP-based congestion handling</td>
            <td class="normal-cell"><span class="dc-chip normal">TCP Congestion Control</span></td>
          </tr>
          <tr>
            <td>Elephant Flows<span class="dc-tagline">Large long-running transfers</span></td>
            <td class="ai-cell">Long-lived high-bandwidth tensor transfers</td>
            <td class="rem-cell">Dynamic flow distribution across multiple paths</td>
            <td class="rem-cell"><div class="dc-chip-row"><span class="dc-chip tech">Flowlet Switching</span><span class="dc-chip tech">Adaptive ECMP</span><span class="dc-chip tech">Dynamic Load Balancing</span></div></td>
            <td class="normal-cell">Mixed small, medium, and shorter-lived flows</td>
            <td class="normal-cell">QoS, traffic engineering, and static multipath routing</td>
            <td class="normal-cell"><div class="dc-chip-row"><span class="dc-chip normal">QoS</span><span class="dc-chip normal">ECMP</span></div></td>
          </tr>
          <tr>
            <td>Communication Pattern<span class="dc-tagline">Collective operations</span></td>
            <td class="ai-cell">Collective communication such as all-reduce and all-gather</td>
            <td class="rem-cell">Optimize collective operations</td>
            <td class="rem-cell"><div class="dc-chip-row"><span class="dc-chip tech">NCCL</span><span class="dc-chip tech">SHARP</span></div></td>
            <td class="normal-cell">Client-server and request-response</td>
            <td class="normal-cell">Standard routing</td>
            <td class="normal-cell"><span class="dc-chip normal">TCP/IP Routing</span></td>
          </tr>
          <tr>
            <td>Traffic Burst Pattern<span class="dc-tagline">Iteration bursts</span></td>
            <td class="ai-cell">Iteration-based synchronized bursts</td>
            <td class="rem-cell">Burst-aware congestion management</td>
            <td class="rem-cell"><div class="dc-chip-row"><span class="dc-chip tech">Telemetry-Driven Balancing</span><span class="dc-chip tech">ECN</span></div></td>
            <td class="normal-cell">Random bursts</td>
            <td class="normal-cell">TCP backoff and buffering</td>
            <td class="normal-cell"><span class="dc-chip normal">TCP Windowing</span></td>
          </tr>
          <tr>
            <td>Bandwidth Usage<span class="dc-tagline">Near line rate</span></td>
            <td class="ai-cell">Sustained near line-rate</td>
            <td class="rem-cell">Non-blocking fabric design</td>
            <td class="rem-cell"><div class="dc-chip-row"><span class="dc-chip tech">Clos/Fat-tree</span><span class="dc-chip tech">Multi-Rail Fabrics</span><span class="dc-chip tech">InfiniBand</span><span class="dc-chip tech">Spectrum-X</span></div></td>
            <td class="normal-cell">Variable utilization</td>
            <td class="normal-cell">Moderate oversubscription</td>
            <td class="normal-cell"><span class="dc-chip normal">Leaf-Spine</span></td>
          </tr>
          <tr>
            <td>Fabric Topology<span class="dc-tagline">Cluster layout</span></td>
            <td class="ai-cell">Topology directly affects collective completion time and congestion hotspots</td>
            <td class="rem-cell">Use low-diameter, high-bisection, rail-aware, or non-blocking fabric layouts</td>
            <td class="rem-cell"><div class="dc-chip-row"><span class="dc-chip tech">Dragonfly</span><span class="dc-chip tech">3-ply</span><span class="dc-chip tech">Fat-tree</span><span class="dc-chip tech">Rail-Optimized Fabric</span></div></td>
            <td class="normal-cell">Usually leaf-spine or traditional multi-tier enterprise fabric</td>
            <td class="normal-cell">Scale capacity through predictable oversubscription and ECMP</td>
            <td class="normal-cell"><div class="dc-chip-row"><span class="dc-chip normal">Leaf-Spine</span><span class="dc-chip normal">Three-Tier DC</span></div></td>
          </tr>
          <tr>
            <td>GPU-to-GPU Communication<span class="dc-tagline">East-west exchange</span></td>
            <td class="ai-cell">Massive east-west GPU tensor exchange</td>
            <td class="rem-cell">High-bandwidth low-latency GPU fabric</td>
            <td class="rem-cell"><div class="dc-chip-row"><span class="dc-chip tech">NVLink</span><span class="dc-chip tech">NVSwitch</span></div></td>
            <td class="normal-cell">Rare direct server-to-server communication</td>
            <td class="normal-cell">Ethernet switching</td>
            <td class="normal-cell"><div class="dc-chip-row"><span class="dc-chip normal">PCIe</span><span class="dc-chip normal">Ethernet</span></div></td>
          </tr>
          <tr>
            <td>Congestion Behavior<span class="dc-tagline">Hotspots</span></td>
            <td class="ai-cell">Rapid hotspot formation</td>
            <td class="rem-cell">Dynamic congestion avoidance</td>
            <td class="rem-cell"><div class="dc-chip-row"><span class="dc-chip tech">Adaptive Routing</span></div></td>
            <td class="normal-cell">Distributed congestion</td>
            <td class="normal-cell">TCP congestion response</td>
            <td class="normal-cell"><span class="dc-chip normal">TCP AIMD</span></td>
          </tr>
          <tr>
            <td>Packet Loss Tolerance<span class="dc-tagline">Low-loss design</span></td>
            <td class="ai-cell">Very low tolerance</td>
            <td class="rem-cell">Lossless Ethernet transport</td>
            <td class="rem-cell"><div class="dc-chip-row"><span class="dc-chip tech">PFC</span><span class="dc-chip tech">ETS</span><span class="dc-chip tech">ECN/DCQCN</span><span class="dc-chip tech">RoCEv2</span><span class="dc-chip tech">InfiniBand</span></div></td>
            <td class="normal-cell">More tolerant</td>
            <td class="normal-cell">Packet retransmission</td>
            <td class="normal-cell"><span class="dc-chip normal">TCP Retransmission</span></td>
          </tr>
          <tr>
            <td>Queue Behavior<span class="dc-tagline">Microbursts</span></td>
            <td class="ai-cell">Heavy microbursts and queue buildup</td>
            <td class="rem-cell">Queue isolation and deep buffering</td>
            <td class="rem-cell"><div class="dc-chip-row"><span class="dc-chip tech">VOQ</span><span class="dc-chip tech">ECN/DCQCN</span><span class="dc-chip tech">Deep Buffers</span></div></td>
            <td class="normal-cell">Moderate queue pressure</td>
            <td class="normal-cell">Shared buffering</td>
            <td class="normal-cell"><span class="dc-chip normal">FIFO Queues</span></td>
          </tr>
          <tr>
            <td>Load Balancing Need<span class="dc-tagline">Path adaptation</span></td>
            <td class="ai-cell">Requires congestion-aware balancing</td>
            <td class="rem-cell">Real-time path adaptation</td>
            <td class="rem-cell"><div class="dc-chip-row"><span class="dc-chip tech">Adaptive ECMP</span><span class="dc-chip tech">Flowlet Switching</span></div></td>
            <td class="normal-cell">Static distribution sufficient</td>
            <td class="normal-cell">Static hashing</td>
            <td class="normal-cell"><span class="dc-chip normal">ECMP Hashing</span></td>
          </tr>
          <tr>
            <td>Traffic Predictability<span class="dc-tagline">Repeating phases</span></td>
            <td class="ai-cell">Repetitive iteration patterns</td>
            <td class="rem-cell">AI-aware workload placement</td>
            <td class="rem-cell"><div class="dc-chip-row"><span class="dc-chip tech">Topology Aware Job Scheduling</span><span class="dc-chip tech">Kubernetes Affinity</span></div></td>
            <td class="normal-cell">Random workload behavior</td>
            <td class="normal-cell">Generic orchestration</td>
            <td class="normal-cell"><span class="dc-chip normal">Standard Scheduling</span></td>
          </tr>
          <tr>
            <td>Scale-Up Networking<span class="dc-tagline">Inside the node</span></td>
            <td class="ai-cell">Extremely high intra-node GPU bandwidth required</td>
            <td class="rem-cell">GPU fabric acceleration</td>
            <td class="rem-cell"><div class="dc-chip-row"><span class="dc-chip tech">NVLink</span><span class="dc-chip tech">NVSwitch</span></div></td>
            <td class="normal-cell">Limited intra-server acceleration</td>
            <td class="normal-cell">Standard server architecture</td>
            <td class="normal-cell"><span class="dc-chip normal">PCIe</span></td>
          </tr>
          <tr>
            <td>Scale-Out Networking<span class="dc-tagline">Across nodes</span></td>
            <td class="ai-cell">Multi-node GPU cluster communication</td>
            <td class="rem-cell">High-speed low-latency AI fabric</td>
            <td class="rem-cell"><div class="dc-chip-row"><span class="dc-chip tech">InfiniBand</span><span class="dc-chip tech">RoCEv2 Ethernet</span><span class="dc-chip tech">Spectrum-X</span></div></td>
            <td class="normal-cell">Standard DC interconnect</td>
            <td class="normal-cell">Enterprise Ethernet</td>
            <td class="normal-cell"><span class="dc-chip normal">Leaf-Spine Ethernet</span></td>
          </tr>
          <tr>
            <td>Performance Goal<span class="dc-tagline">Cluster efficiency</span></td>
            <td class="ai-cell">Minimize GPU idle time</td>
            <td class="rem-cell">Optimize collective completion time</td>
            <td class="rem-cell"><div class="dc-chip-row"><span class="dc-chip tech">NCCL Optimization</span><span class="dc-chip tech">SHARP</span></div></td>
            <td class="normal-cell">App responsiveness</td>
            <td class="normal-cell">Throughput optimization</td>
            <td class="normal-cell"><span class="dc-chip normal">Load Balancers</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</section>

## The Problem Statement

<div class="blog-story">
  <p class="story-lead">The problem with reusing a traditional data center network for AI is not that Ethernet, <code>ECMP</code>, or leaf-spine are bad ideas. The problem is that traditional assumptions can become wrong. Oversubscription that was acceptable for web workloads can become a bottleneck when many GPUs need to exchange training data at the same time. Static hashing that was fine for mixed application flows can place large tensor transfers on the same path. Packet drops that TCP could recover from can damage the performance of RDMA traffic. Queues that were tolerable for background traffic can become visible as GPU idle time or inference tail latency.</p>
  <aside class="story-note">
    <strong>RDMA</strong>
    <p>Remote Direct Memory Access is a technology that allows one computer to directly access the memory of another computer over a network without involving either computer's operating system, processor, or kernel. This enables high-throughput, low-latency networking, which is particularly useful in massively parallel computer clusters. RDMA operates using a network interface controller, or NIC, that supports RDMA, such as <span class="story-ai">InfiniBand</span> or RDMA over Converged Ethernet, also called <span class="story-net">RoCE</span>. These NICs have specialized hardware that allows them to directly access memory on the connected system without CPU involvement. When a system wants to transfer data using RDMA, it sends a request to the NIC, and the NIC uses that hardware to transfer the data directly to memory on the other system.</p>
  </aside>
  <p>This is why AI networking cannot be treated as a simple capacity upgrade; it is more about a change in the traffic pattern. A training iteration may look quiet while GPUs are busy, and then suddenly the fabric sees a wave: many senders become active together, the same paths and queues are stressed together, and the slowest part of the exchange can hold back the next compute phase. This is why <span class="story-ai">AI networking feels different</span> from normal application networking. The traffic is synchronous.</p>
  <p>That synchronization is what makes <span class="story-mark">incast</span> so important. During a collective operation, many GPUs may send toward the same receiver, aggregation point, or congested output queue. A traditional network might wait for TCP to detect loss and back off, but AI traffic often cannot afford that delay. This is where <code>DCB</code>, or Data Center Bridging, enters the discussion. DCB enhances traditional Ethernet to create a lossless, high-performance network fabric. It helped Ethernet move toward a converged LAN/SAN model, where normal application traffic, storage-style traffic, and RDMA traffic can share the same physical fabric while still receiving different treatment.</p>
  <ul class="story-list">
    <li><strong>PFC (Priority Flow Control):</strong> Classic Ethernet PAUSE pauses the entire link. That is dangerous because one congested traffic type can block everything. PFC improves this by pausing only specific priority classes. At first it can look like <code>QoS</code> because it uses traffic priorities, but it is different. QoS usually decides how traffic is classified, queued, scheduled, or dropped. PFC works at the data link layer and sends a pause signal for a specific traffic class on a local hop. That makes it fast and hop-by-hop, and it can pause the RDMA or lossless class.</li>
    <li><strong>ETS</strong>, or Enhanced Transmission Selection, assigns bandwidth shares to traffic classes so one class does not consume the link unfairly when LAN, storage, and RDMA traffic coexist.</li>
    <li><strong>DCBX</strong>, or Data Center Bridging Exchange, is an extension of <code>LLDP</code>. It lets neighboring devices exchange DCB settings such as priority groups and PFC configuration, reducing the risk of mismatched lossless-class behavior between a server NIC and switch.</li>
    <li><strong>DCQCN / ECN</strong> combines congestion marking and rate control for <span class="story-net">RoCEv2</span>. Unlike PFC, ECN does not send pause frames. It marks traffic at the network layer when congestion is building, and DCQCN uses those marks to slow senders before queues become dangerous. Because this feedback depends on marked packets returning through the control loop, it is more affected by round-trip time than local PFC pause behavior.</li>
  </ul>
  <div class="fabric-cases" aria-label="Leaf-spine congestion scenarios">
    <article class="fabric-case">
      <h3>Scenario 1: Leaf-to-Spine Uplink Congestion</h3>
      <p>When several GPU flows leave the same leaf at the same time, static hashing can place too many of them on one spine-facing uplink. One uplink becomes hot while other equal-cost uplinks still have usable capacity.</p>
      <svg class="fabric-diagram" viewBox="0 0 520 250" role="img" aria-labelledby="uplink-title uplink-desc">
        <title id="uplink-title">Leaf-to-spine uplink congestion</title>
        <desc id="uplink-desc">Multiple flows from one leaf switch converge on one uplink toward a spine switch while other uplinks remain underused.</desc>
        <defs>
          <marker id="arrow-uplink-green" markerWidth="8" markerHeight="8" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill="#16a34a" />
          </marker>
          <marker id="arrow-uplink-hot" markerWidth="8" markerHeight="8" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill="#f97316" />
          </marker>
        </defs>
        <line class="fabric-link" x1="105" y1="164" x2="105" y2="58" />
        <line class="fabric-link" x1="105" y1="164" x2="260" y2="58" />
        <line class="fabric-link" x1="105" y1="164" x2="415" y2="58" />
        <line class="fabric-link" x1="260" y1="164" x2="105" y2="58" />
        <line class="fabric-link" x1="260" y1="164" x2="260" y2="58" />
        <line class="fabric-link" x1="260" y1="164" x2="415" y2="58" />
        <line class="fabric-link" x1="415" y1="164" x2="105" y2="58" />
        <line class="fabric-link" x1="415" y1="164" x2="260" y2="58" />
        <line class="fabric-link" x1="415" y1="164" x2="415" y2="58" />
        <path class="fabric-flow" d="M72 220 C72 180 96 126 100 62" marker-end="url(#arrow-uplink-green)" />
        <path class="fabric-flow" d="M94 220 C94 176 104 124 105 62" marker-end="url(#arrow-uplink-green)" />
        <path class="fabric-hot" d="M116 220 C116 174 113 120 110 62" marker-end="url(#arrow-uplink-hot)" />
        <text class="fabric-label" x="126" y="116">Congested uplink</text>
        <rect class="fabric-switch" x="65" y="28" width="80" height="28" rx="3" />
        <rect class="fabric-switch" x="220" y="28" width="80" height="28" rx="3" />
        <rect class="fabric-switch" x="375" y="28" width="80" height="28" rx="3" />
        <rect class="fabric-switch" x="65" y="164" width="80" height="28" rx="3" />
        <rect class="fabric-switch" x="220" y="164" width="80" height="28" rx="3" />
        <rect class="fabric-switch" x="375" y="164" width="80" height="28" rx="3" />
        <text class="fabric-switch-text" x="105" y="46">Spine</text>
        <text class="fabric-switch-text" x="260" y="46">Spine</text>
        <text class="fabric-switch-text" x="415" y="46">Spine</text>
        <text class="fabric-switch-text" x="105" y="182">Leaf</text>
        <text class="fabric-switch-text" x="260" y="182">Leaf</text>
        <text class="fabric-switch-text" x="415" y="182">Leaf</text>
        <line class="fabric-host" x1="86" y1="192" x2="86" y2="222" />
        <line class="fabric-host" x1="105" y1="192" x2="105" y2="222" />
        <line class="fabric-host" x1="124" y1="192" x2="124" y2="222" />
        <line class="fabric-host" x1="244" y1="192" x2="244" y2="212" />
        <line class="fabric-host" x1="260" y1="192" x2="260" y2="212" />
        <line class="fabric-host" x1="399" y1="192" x2="399" y2="212" />
        <line class="fabric-host" x1="415" y1="192" x2="415" y2="212" />
      </svg>
    </article>
    <article class="fabric-case">
      <h3>Scenario 2: Spine-to-Leaf Downlink Congestion</h3>
      <p>The reverse can happen when flows from different source leaves are all headed toward the same destination leaf. Each ingress leaf may choose a path independently, so the final spine-to-leaf downlink can fill even when the rest of the fabric has spare bandwidth.</p>
      <svg class="fabric-diagram" viewBox="0 0 520 250" role="img" aria-labelledby="downlink-title downlink-desc">
        <title id="downlink-title">Spine-to-leaf downlink congestion</title>
        <desc id="downlink-desc">Traffic from multiple leaves converges through a spine and overloads one downlink toward a destination leaf switch.</desc>
        <defs>
          <marker id="arrow-downlink-green" markerWidth="8" markerHeight="8" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill="#16a34a" />
          </marker>
          <marker id="arrow-downlink-hot" markerWidth="8" markerHeight="8" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill="#f97316" />
          </marker>
        </defs>
        <line class="fabric-link" x1="105" y1="164" x2="105" y2="58" />
        <line class="fabric-link" x1="105" y1="164" x2="260" y2="58" />
        <line class="fabric-link" x1="105" y1="164" x2="415" y2="58" />
        <line class="fabric-link" x1="260" y1="164" x2="105" y2="58" />
        <line class="fabric-link" x1="260" y1="164" x2="260" y2="58" />
        <line class="fabric-link" x1="260" y1="164" x2="415" y2="58" />
        <line class="fabric-link" x1="415" y1="164" x2="105" y2="58" />
        <line class="fabric-link" x1="415" y1="164" x2="260" y2="58" />
        <line class="fabric-link" x1="415" y1="164" x2="415" y2="58" />
        <path class="fabric-flow" d="M86 220 C86 170 156 94 252 58" marker-end="url(#arrow-downlink-green)" />
        <path class="fabric-flow" d="M252 220 C252 170 250 104 260 62" marker-end="url(#arrow-downlink-green)" />
        <path class="fabric-hot" d="M268 62 C310 96 370 132 410 162" marker-end="url(#arrow-downlink-hot)" />
        <path class="fabric-flow" d="M108 220 C160 188 270 122 406 164" marker-end="url(#arrow-downlink-green)" />
        <text class="fabric-label" x="315" y="112">Congested downlink</text>
        <rect class="fabric-switch" x="65" y="28" width="80" height="28" rx="3" />
        <rect class="fabric-switch" x="220" y="28" width="80" height="28" rx="3" />
        <rect class="fabric-switch" x="375" y="28" width="80" height="28" rx="3" />
        <rect class="fabric-switch" x="65" y="164" width="80" height="28" rx="3" />
        <rect class="fabric-switch" x="220" y="164" width="80" height="28" rx="3" />
        <rect class="fabric-switch" x="375" y="164" width="80" height="28" rx="3" />
        <text class="fabric-switch-text" x="105" y="46">Spine</text>
        <text class="fabric-switch-text" x="260" y="46">Spine</text>
        <text class="fabric-switch-text" x="415" y="46">Spine</text>
        <text class="fabric-switch-text" x="105" y="182">Leaf</text>
        <text class="fabric-switch-text" x="260" y="182">Leaf</text>
        <text class="fabric-switch-text" x="415" y="182">Leaf</text>
        <line class="fabric-host" x1="86" y1="192" x2="86" y2="222" />
        <line class="fabric-host" x1="105" y1="192" x2="105" y2="222" />
        <line class="fabric-host" x1="244" y1="192" x2="244" y2="222" />
        <line class="fabric-host" x1="260" y1="192" x2="260" y2="222" />
        <line class="fabric-host" x1="399" y1="192" x2="399" y2="222" />
        <line class="fabric-host" x1="415" y1="192" x2="415" y2="222" />
      </svg>
    </article>
  </div>
  <p>Once the burst begins, the pressure moves from queues to paths. AI jobs create <span class="story-mark">elephant flows</span> (large, long-lived packets) because tensors, gradients, and model data are large. A static ECMP hash can accidentally place several large transfers on the same path while another equal-cost path sits underused. <code>Adaptive ECMP</code> improves this by using congestion or telemetry signals instead of relying only on a hash. <code>Flowlet switching</code> is more careful still: it moves traffic at burst boundaries, after a small idle gap, instead of spraying every packet independently. That difference matters because packet spraying can create reordering, while flowlet switching tries to preserve order by keeping each burst together.</p>
  <p>The same problem becomes more visible when flows last longer. A long-lived AI transfer pinned to a poor path can waste bandwidth for an entire phase of the job. <code>DLB</code>, or Dynamic Load Balancing, is Cisco's congestion-aware enhancement to ECMP. It is one practical way to achieve adaptive path selection in AI fabrics by steering flowlets toward healthier links instead of relying only on static hashing. This is why AI fabric conversations keep returning to <span class="story-net">adaptive routing, flowlets, telemetry, and congestion-aware balancing</span>. The workload is too synchronized, and the GPUs are too expensive, to leave path selection entirely to static hashing.</p>
  <p>As the cluster grows, the conversation shifts from individual flows to the shape of the fabric itself. In a normal data center, moderate oversubscription may be acceptable because not every workload peaks at the same time. In AI training, many GPUs can demand bandwidth at the same time by design. <span class="story-warn">Clos</span> and <span class="story-warn">fat-tree</span> fabrics provide predictable bisection bandwidth. <code>3-ply</code> describes a three-layer network with a super-spine layer, and is recommended for Intel Gaudi designs. <code>Dragonfly</code> becomes useful at larger scale because it lowers network diameter through strong group-to-group connectivity. Rail-optimized designs matter when servers have multiple NICs or GPU rails and the network needs to keep traffic aligned with the physical layout instead of creating avoidable cross-rail hotspots.</p>
  <p>The reason this topology work matters is <span class="story-ai">GPU-to-GPU communication</span>. Inside a node, <code>NVLink</code> and <code>NVSwitch</code> move data between GPUs at very high bandwidth. Once the job crosses server boundaries, the scale-out fabric has to provide the closest possible experience: low latency, high throughput, low loss, and predictable path behavior. If that fabric is weak, GPUs wait. In training, waiting shows up as lower cluster utilization. In inference, waiting shows up as slower tokens, worse tail latency, and lower request throughput.</p>
  <p>At that point the design often becomes a choice between Ethernet-based RDMA and a purpose-built cluster fabric with InfiniBand. RoCEv2 brings RDMA semantics to Ethernet, which makes it attractive when a team wants Ethernet economics, Ethernet operations, and integration with the broader data center. But RoCEv2 should not be treated like ordinary best-effort Ethernet. It needs disciplined QoS, PFC, ECN, congestion control, and careful telemetry. When those pieces are operated well, RoCEv2 can support high-performance AI fabrics while staying in the Ethernet ecosystem.</p>
  <p>InfiniBand starts from a different place. It is built as a high-performance cluster fabric, so it is often chosen when the environment is performance-first, tightly controlled, and designed around large training jobs. The operational model can be more specialized than Ethernet, but the fabric behavior maps naturally to low-latency, RDMA-heavy AI and HPC communication.</p>
  <h3 class="story-subhead">Fabric Choice: InfiniBand, Spectrum-X, or Enterprise Ethernet</h3>
  <div class="fabric-choice-wrap">
    <table class="fabric-choice-table">
      <thead>
        <tr>
          <th>Fabric</th>
          <th>Pros</th>
          <th>Cons</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>InfiniBand</td>
          <td><p>Built for HPC and AI cluster communication from the start. It gives strong RDMA behavior, low latency, high throughput, and predictable performance for tightly coupled training jobs where many GPUs communicate together.</p></td>
          <td><p>The operating model is more specialized than normal Ethernet. Teams may need separate skills, tools, cabling choices, and lifecycle processes, and the fabric can feel less natural for environments that want one common enterprise network model.</p></td>
        </tr>
        <tr>
          <td>Spectrum-X</td>
          <td><p>NVIDIA Spectrum-X keeps the Ethernet direction but makes it more AI-specific, combining Spectrum Ethernet switches, SuperNICs, congestion control, telemetry, and adaptive behavior for more predictable RoCE-based GPU fabrics.</p></td>
          <td><p>It should not be treated like generic Ethernet. The value comes from a more coordinated platform, so hardware choice, NIC behavior, software, telemetry, and RoCE/DCB configuration all matter. Poor tuning can still expose loss, queuing, or path imbalance.</p></td>
        </tr>
        <tr>
          <td>Enterprise Ethernet</td>
          <td><p>Familiar, broadly interoperable, and easy to integrate with existing data center operations. It works well for conventional application traffic, storage access, management traffic, and smaller AI environments that are not dominated by synchronized GPU exchange.</p></td>
          <td><p>A default leaf-spine Ethernet design is often too best-effort for large AI training. Static ECMP, oversubscription, normal buffering, and ordinary TCP recovery can leave GPUs waiting unless the fabric is redesigned with lossless classes, ECN, PFC, telemetry, and congestion-aware balancing.</p></td>
        </tr>
      </tbody>
    </table>
  </div>
  <p>Inference adds another twist. If a model is served from one GPU or one server, the network may mostly carry user requests, retrieval calls, storage access, or service-to-service traffic. A traditional Ethernet design may be enough. But when inference scales into multi-GPU or multi-node serving, the network starts to affect token latency, batching efficiency, cache movement, and tail behavior. The same fabric ideas return: avoid incast, reduce hot paths, protect RDMA traffic when it is used, and design topology for predictable east-west movement.</p>
  <p class="story-rule">The practical rule is to match the network to the communication pattern. Use NVLink and NVSwitch for scale-up GPU communication inside a server or tightly coupled system. Use RoCEv2 when Ethernet integration matters and the team can operate a tuned lossless fabric. Use InfiniBand when the cluster is built primarily for high-performance AI or HPC communication. Use Clos, 3-ply, Dragonfly, fat-tree, and rail-optimized layouts when the problem is not just connecting nodes, but keeping synchronized GPU communication predictable at scale.</p>
  <p>That is the larger shift. Traditional networking connected applications. AI data center networking has to support the communication pattern of the workload itself: synchronized training phases, bursty inference paths, long tensor transfers, RDMA traffic, topology-aware scheduling, and GPU-to-GPU movement. The network is still transport, but in AI it also becomes a performance boundary.</p>
</div>
