/* Curriculum. Each step: { dev, mirror?, exec?, when?, coach?, cmds(d) } ; each cmd: { c, m?, x?, out?, ev? }.
   x = explanation card {w: what it does, y: why it matters, g: gotcha}. Syntax is Cisco NX-OS (10.x).
   Show-command outputs are REPRESENTATIVE (trimmed); exact formatting varies by NX-OS release. */
const X = (w, y, g) => ({ w, y, g });
const E = (links, label, pkts, learn, o) => Object.assign({ links, label, pkts, learn }, o || {});
const N = d => DEV[d].name;
const SPN = ['spine1', 'spine2'];
const stepsOf = ch => ch.steps.filter(s => !s.when || s.when());

const CHAPTERS = [];

/* ---------------------------------------------------------------- Chapter 1 : underlay (OSPF [+PIM]) */
CHAPTERS.push({
  id: 1, title: 'Underlay', sub: 'OSPF · (PIM)',
  intro: () => ({ t: 'Chapter 1 — The underlay', b: 'VXLAN is only an <b>overlay</b>: it rides on an ordinary IP network. Before any VXLAN or EVPN exists, every VTEP loopback must reach every other VTEP loopback over ECMP. We build routed /31 links with jumbo MTU and run <b>OSPF area 0</b>' + (MC() ? ', then enable <b>PIM sparse-mode with an Anycast-RP on the two spines</b> for multicast BUM replication.' : '. (BUM mode is <b>ingress replication</b> — no multicast needed. Switch to Multicast in the top bar to see the PIM variant.)'), btn: "Let's configure it" }),
  steps: [
    { dev: 'leaf1', mirror: ['leaf2', 'border'],
      coach: { t: 'Routed point-to-point links', b: 'We start on <b>Leaf-1</b>. Leaf-2 and Border-Leaf get the same pattern with their own addresses (applied silently after Leaf-1).' },
      cmds: d => {
        const o = [];
        UPL[d].forEach((u, i) => {
          const sp = N(u.spine);
          o.push({ c: `interface ${u.ifc}`, m: 'config-if', x: i === 0 ? X(`Enter configuration mode for the uplink toward ${sp}.`, 'Every leaf uses Ethernet1/1 for Spine-1 and Ethernet1/2 for Spine-2. Consistent port numbering makes the fabric easy to automate and troubleshoot.') : X(`Second uplink — toward ${sp}. Same recipe as before.`, 'Two uplinks = two equal-cost paths. Losing one spine halves bandwidth but never breaks reachability.') });
          o.push({ c: 'no switchport', x: i === 0 ? X('Turns the port into a routed (Layer 3) interface.', 'Underlay links are routed, not switched: no spanning tree, no VLANs, no MAC learning on fabric links. Failures are handled by routing convergence and ECMP.', 'Nexus ports default to L2 (switchport). Forgetting this is the classic reason a /31 won’t come up.') : null });
          o.push({ c: 'mtu 9216', cam: i === 0 ? { n: 'gauge', at: { dev: d } } : undefined, x: i === 0 ? X('Sets jumbo MTU on the link.', 'VXLAN adds <b>50 bytes</b> (14 outer Ethernet + 20 IP + 8 UDP + 8 VXLAN). A host sending a 1500-byte IP packet needs at least 1550 on EVERY underlay hop. 9216 gives headroom for jumbo-frame servers.', 'MTU must match on both ends and on every hop — and OSPF also checks the MTU in its DBD packets, so a mismatch even stops the adjacency.') : null });
          o.push({ c: `ip address ${u.ip}/31`, x: i === 0 ? X(`Addresses the link: ${u.ip}/31 on the leaf, ${u.peer}/31 on the spine.`, 'A /31 (RFC 3021) wastes no addresses on a point-to-point link. The pattern 10.2.&lt;leaf&gt;&lt;spine&gt;.x makes any link readable at a glance.') : null });
          o.push({ c: 'no shutdown', x: i === 0 ? X('Enables the interface.') : null });
        });
        o.push({ c: 'interface loopback0', m: 'config-if', x: X('Create Loopback0 — router-id and BGP-peering address.', 'Loopbacks never go down while any path to the router exists, so BGP sessions between loopbacks survive single link failures.') });
        o.push({ c: `ip address ${DEV[d].lo0}/32` });
        o.push({ c: 'interface loopback1', m: 'config-if', x: X('Create Loopback1 — the <b>VTEP</b> address.', 'This IP becomes the source of every VXLAN packet this leaf sends and the BGP <b>next hop</b> of every EVPN route it advertises.', 'Kept separate from Loopback0 on purpose so the VTEP identity can change (e.g. anycast/vPC designs) without touching BGP peering.') });
        o.push({ c: `ip address ${DEV[d].lo1}/32` });
        return o;
      } },
    { dev: 'spine1', mirror: ['spine2'],
      coach: { t: 'Now the spine side', b: 'Each spine needs the other end of every /31, and its own loopback. <b>Spine-2</b> gets the same configuration, applied silently.' },
      cmds: d => {
        const o = [];
        DOWN[d].forEach((u, i) => {
          o.push({ c: `interface ${u.ifc}`, m: 'config-if', x: i === 0 ? X(`Spine-side port toward ${N(u.leaf)}.`, 'Spines do nothing but route between leaves. They hold no VLANs, no VNIs and no hosts.') : null });
          o.push({ c: 'no switchport' });
          o.push({ c: 'mtu 9216', x: i === 0 ? X('Same jumbo MTU as the leaf end.', 'The MTU is only as good as the smallest link in the path.') : null });
          o.push({ c: `ip address ${u.ip}/31`, x: i === 0 ? X(`The .0 end of ${u.ip}/31; the leaf is ${u.peer}.`) : null });
          o.push({ c: 'no shutdown' });
        });
        o.push({ c: 'interface loopback0', m: 'config-if', x: X('Spine loopback: router-id and the target the leaves will peer to for EVPN (Chapter 3).') });
        o.push({ c: `ip address ${DEV[d].lo0}/32` });
        return o;
      } },
    { dev: 'leaf1', exec: true,
      coach: { t: 'Prove the links before routing', b: 'A <b>jumbo, DF-bit ping</b> proves both the /31 and the MTU in one shot.' },
      cmds: d => [
        { c: 'ping 10.2.11.0 packet-size 8972 df-bit count 2', cam: { n: 'gauge', at: { link: ['leaf1', 'spine1'], dy: -40 } },
          x: X('Pings Spine-1 with an 8972-byte payload and the Don’t-Fragment bit set.', 'If any hop had MTU 1500, DF-set packets would be dropped. Success proves the path carries jumbo frames — a prerequisite for VXLAN.'),
          out: ['PING 10.2.11.0 (10.2.11.0): 8972 data bytes', '8980 bytes from 10.2.11.0: icmp_seq=0 ttl=254 time=1.021 ms', '8980 bytes from 10.2.11.0: icmp_seq=1 ttl=254 time=0.978 ms', '', '--- 10.2.11.0 ping statistics ---', '2 packets transmitted, 2 packets received, 0.00% packet loss'],
          ev: E([['leaf1', 'spine1']], 'ICMP jumbo ping', [P.icmp('leaf1', 'spine1', 8972, false, true, '10.2.11.1', '10.2.11.0'), P.icmp('spine1', 'leaf1', 8972, true, false, '10.2.11.0', '10.2.11.1')],
            'Look at the <b>Length</b> column: a <b>9014-byte frame</b> crossed the link with DF set. This is the first thing to check when VXLAN "works for small pings but not for real traffic".') }
      ] },
    { dev: 'leaf1', mirror: ['leaf2', 'border'],
      coach: { t: 'OSPF: the underlay routing protocol', b: 'One area, point-to-point links, loopbacks included. Simple, fast and perfect for an underlay that only needs <b>reachability + ECMP</b>. BGP is reserved for the overlay.' },
      cmds: d => {
        const o = [
          { c: 'feature ospf', m: 'config', x: X('Enables the OSPF process.', 'NX-OS features are off until enabled.') },
          { c: 'router ospf UNDERLAY', m: 'config-router', x: X('Creates OSPF instance “UNDERLAY”.', 'The name is local only — pick one that tells you what it is for.') },
          { c: `router-id ${DEV[d].lo0}`, x: X('Pins the OSPF router-id to Loopback0.', 'A stable, explicit ID avoids surprises when interface addresses change.') },
          { c: 'exit', m: 'config' }
        ];
        UPL[d].forEach((u, i) => {
          o.push({ c: `interface ${u.ifc}`, m: 'config-if' });
          o.push({ c: 'ip ospf network point-to-point', x: i === 0 ? X('Treat the link as point-to-point.', 'No DR/BDR election, no Type-2 LSA, faster adjacency. Always do this on routed leaf-spine links.') : null });
          const c = { c: 'ip router ospf UNDERLAY area 0.0.0.0', x: i === 0 ? X('Enable OSPF on this interface in area 0.', 'Interface-level enablement (no network statements) is the NX-OS way. The interface starts sending Hellos immediately.') : null };
          if (d === 'leaf1' && i === 0) c.ev = E([['leaf1', 'spine1']], 'OSPF Hello — nobody answers', [P.ospf('leaf1', 'spine1', 'hello', { key: true })],
            'Leaf-1 is multicasting <b>Hello</b> packets to <b>224.0.0.5</b>. Expand OSPF: <b>Active Neighbor is empty</b> — it hears nobody, because Spine-1 isn’t running OSPF yet. The adjacency can’t form until both ends speak.');
          o.push(c);
        });
        o.push({ c: 'interface loopback0', m: 'config-if' });
        o.push({ c: 'ip router ospf UNDERLAY area 0.0.0.0', x: X('Advertise Loopback0 (stub /32).', 'Loopbacks are announced as stub routes — they never flap with links.') });
        o.push({ c: 'interface loopback1', m: 'config-if' });
        o.push({ c: 'ip router ospf UNDERLAY area 0.0.0.0', x: X('Advertise the VTEP loopback.', 'Every VTEP must be reachable from every other VTEP — if this prefix is missing, VXLAN tunnels cannot form.') });
        return o;
      } },
    { dev: 'spine1', mirror: ['spine2'],
      coach: { t: 'Spines join the party', b: 'Watch Wireshark: as soon as Spine-1 enables OSPF on its Leaf-1 link, the adjacency walks through <b>Hello → DBD → LSU → LSAck</b>.' },
      cmds: d => {
        const o = [
          { c: 'feature ospf', m: 'config' }, { c: 'router ospf UNDERLAY', m: 'config-router' },
          { c: `router-id ${DEV[d].lo0}` }, { c: 'exit', m: 'config' }
        ];
        DOWN[d].forEach((u, i) => {
          o.push({ c: `interface ${u.ifc}`, m: 'config-if' });
          o.push({ c: 'ip ospf network point-to-point', x: i === 0 ? X('Point-to-point toward the leaf — must match the leaf side.') : null });
          const c = { c: 'ip router ospf UNDERLAY area 0.0.0.0', x: i === 0 ? X(`Start OSPF toward ${N(u.leaf)}.`) : null };
          if (d === 'spine1' && i === 0) c.cam = { n: 'handshake', at: { link: ['leaf1', 'spine1'] } };
          if (d === 'spine1' && i === 0) c.ev = E([['leaf1', 'spine1']], 'OSPF adjacency forms', [
            P.ospf('spine1', 'leaf1', 'hello'), P.ospf('leaf1', 'spine1', 'hello', { seen: true, key: true }), P.ospf('leaf1', 'spine1', 'dbd'),
            P.ospf('spine1', 'leaf1', 'dbd'), P.ospf('leaf1', 'spine1', 'lsu'), P.ospf('spine1', 'leaf1', 'ack')],
            'Follow the story: <b>Hello</b> (Leaf-1’s Hello now lists Spine-1 under <i>Active Neighbor</i> = 2-Way) → <b>DB Description</b> (note the <b>Interface MTU 9216</b> — must match) → <b>LS Update</b> carrying the Router-LSA with Leaf-1’s two loopbacks as stub links → <b>LS Ack</b>. Adjacency = <b>FULL</b>.');
          o.push(c);
        });
        o.push({ c: 'interface loopback0', m: 'config-if' });
        o.push({ c: 'ip router ospf UNDERLAY area 0.0.0.0', x: X('Advertise the spine loopback (leaves will peer to it in Chapter 3).') });
        return o;
      } },
    { dev: 'spine1', mirror: ['spine2'], when: MC,
      coach: { t: 'Multicast underlay — PIM with Anycast-RP', b: 'In <b>multicast BUM mode</b> each VNI maps to a multicast group. The underlay needs <b>PIM sparse-mode</b> and a Rendezvous Point. Both spines share <b>one RP address (10.254.254.1)</b> — that is Anycast-RP: redundancy with no extra protocol dependencies.' },
      cmds: d => {
        const o = [
          { c: 'feature pim', m: 'config', x: X('Enables PIM.') },
          { c: `ip pim rp-address ${RP_IP} group-list 239.1.1.0/24`, x: X('Statically defines the RP for the VXLAN BUM groups.', 'Every router in the underlay must agree on the RP for 239.1.1.0/24. Static RP is simple and deterministic for a fabric.') },
          { c: `ip pim anycast-rp ${RP_IP} 10.0.0.1`, x: X('Declares Spine-1 (Loopback0) as an Anycast-RP set member.', 'Each spine lists <b>every</b> member, including itself. The members use each other’s unique Loopback0 addresses to share (S,G) state — the PIM Anycast-RP method (RFC 4610).') },
          { c: `ip pim anycast-rp ${RP_IP} 10.0.0.2`, x: X('Declares Spine-2 (Loopback0) as the other member.') },
          { c: 'interface loopback254', m: 'config-if', x: X('Creates the shared RP loopback.', 'Identical IP on both spines. OSPF advertises it from both, so leaves reach the <i>nearest</i> RP over ECMP — if one spine dies the other keeps serving.') },
          { c: `ip address ${RP_IP}/32` },
          { c: 'ip router ospf UNDERLAY area 0.0.0.0', x: X('Advertise the RP address in the underlay — the RP must be reachable.') },
          { c: 'ip pim sparse-mode', x: X('Run PIM on the RP loopback.') },
          { c: 'interface loopback0', m: 'config-if' },
          { c: 'ip pim sparse-mode', x: X('PIM on Loopback0, the Anycast-RP set-member address.') }
        ];
        DOWN[d].forEach((u, i) => { o.push({ c: `interface ${u.ifc}`, m: 'config-if' }); o.push({ c: 'ip pim sparse-mode', x: i === 0 ? X('PIM sparse-mode on every fabric-facing link.', 'Without it, no PIM neighbors form and multicast BUM traffic would be dropped at that hop.') : null }); });
        return o;
      } },
    { dev: 'leaf1', mirror: ['leaf2', 'border'], when: MC,
      coach: { t: 'Leaves join the PIM domain', b: 'Leaves only need PIM on their uplinks and the <b>VTEP loopback</b> — plus the RP address.' },
      cmds: d => {
        const o = [
          { c: 'feature pim', m: 'config' },
          { c: `ip pim rp-address ${RP_IP} group-list 239.1.1.0/24`, x: X('Point at the Anycast-RP address.', 'Leaves never need to know there are two RPs — the anycast address hides it.') }
        ];
        UPL[d].forEach((u, i) => {
          o.push({ c: `interface ${u.ifc}`, m: 'config-if' });
          const c = { c: 'ip pim sparse-mode', x: i === 0 ? X('PIM sparse-mode on the uplink.') : null };
          if (d === 'leaf1' && i === 0) c.ev = E([['leaf1', 'spine1']], 'PIM neighbors', [P.pimHello('leaf1', 'spine1', true), P.pimHello('spine1', 'leaf1')],
            'Both ends send <b>PIM Hellos</b> to <b>224.0.0.13</b>. Once each hears the other, they are PIM neighbors. Expand <b>Option 1: Hold Time</b> — if Hellos stop for 105 s the neighbor is declared dead.');
          o.push(c);
        });
        o.push({ c: 'interface loopback1', m: 'config-if' });
        o.push({ c: 'ip pim sparse-mode', x: X('PIM on the VTEP loopback.', 'The NVE source loopback is where the VTEP joins and sources multicast groups — it must run PIM or the VNI’s BUM group can never be joined.') });
        return o;
      } },
    { dev: 'leaf1', exec: true,
      coach: { t: 'Verify the underlay', b: 'Are the adjacencies FULL, and do we have <b>two equal-cost paths</b> to the other VTEPs?' },
      cmds: d => [
        { c: 'show ip ospf neighbors', x: X('Lists OSPF adjacencies.', 'Healthy = <b>FULL</b>. Stuck in INIT/2WAY/EXSTART usually means a mask/MTU/area mismatch.'),
          out: [' OSPF Process ID UNDERLAY VRF default', ' Total number of neighbors: 2', ' Neighbor ID     Pri State            Up Time  Address         Interface', ' 10.0.0.1          1 FULL/ -          00:03:41 10.2.11.0       Eth1/1', ' 10.0.0.2          1 FULL/ -          00:03:40 10.2.12.0       Eth1/2'] },
        { c: 'show ip route 10.1.1.2', x: X('Looks up Leaf-2’s VTEP address.', 'Two <b>*via</b> lines = ECMP. This is why VXLAN tunnels get load-balanced across both spines.'),
          out: ['10.1.1.2/32, ubest/mbest: 2/0', '    *via 10.2.11.0, Eth1/1, [110/3], 00:03:12, ospf-UNDERLAY, intra', '    *via 10.2.12.0, Eth1/2, [110/3], 00:03:11, ospf-UNDERLAY, intra'] },
        ...(MC() ? [
          { c: 'show ip pim neighbor', x: X('PIM neighbors.'), out: ['PIM Neighbor Status for VRF "default"', 'Neighbor        Interface            Uptime    Expires   DR       Bidir-  BFD', '                                                         Priority Capable State', '10.2.11.0       Ethernet1/1          00:01:02  00:01:43  1        yes     n/a', '10.2.12.0       Ethernet1/2          00:01:01  00:01:44  1        yes     n/a'] },
          { c: 'show ip pim rp', x: X('Confirms the RP.', 'RP-source (local) = static.'), out: ['PIM RP Status Information for VRF "default"', 'RP: 10.254.254.1, (0), uptime: 00:01:11   priority: 255,', '  RP-source: (local),', '  group ranges:', '  239.1.1.0/24'] }] : []),
        { c: 'ping 10.1.1.2 source loopback1 count 2', x: X('VTEP-to-VTEP ping, sourced from our own Loopback1.', 'This is exactly the path VXLAN packets will take. If this fails, nothing in the overlay can work.'),
          out: ['PING 10.1.1.2 (10.1.1.2) from 10.1.1.1: 56 data bytes', '64 bytes from 10.1.1.2: icmp_seq=0 ttl=253 time=1.4 ms', '64 bytes from 10.1.1.2: icmp_seq=1 ttl=253 time=1.1 ms', '', '2 packets transmitted, 2 packets received, 0.00% packet loss'],
          ev: E([['leaf1', 'spine1']], 'VTEP-to-VTEP ping', [P.icmp('leaf1', 'spine1', 56, false, true, '10.1.1.1', '10.1.1.2'), P.icmp('spine1', 'leaf1', 56, true, false, '10.1.1.2', '10.1.1.1')],
            'Source <b>10.1.1.1</b> (Leaf-1’s VTEP) → destination <b>10.1.1.2</b> (Leaf-2’s VTEP). This flow hashed onto the Spine-1 uplink; another flow may use Spine-2.') }
      ] }
  ],
  recap: () => ({ t: 'Underlay complete', pts: ['Routed /31s with MTU 9216 — VXLAN needs ≥ 1550 on every hop.', 'OSPF area 0, point-to-point: Hello → DBD → LSU → LSAck, adjacency FULL.', 'Every VTEP loopback is reachable over <b>2 equal-cost paths</b> (ECMP).'].concat(MC() ? ['PIM sparse-mode + <b>Anycast-RP</b> (10.254.254.1 on both spines) ready for multicast BUM.'] : []) })
});

/* ---------------------------------------------------------------- Chapter 2 : VTEP & VNI */
CHAPTERS.push({
  id: 2, title: 'VTEP & VNI', sub: 'NVE, VLAN→VNI',
  intro: () => ({ t: 'Chapter 2 — Becoming a VTEP', b: 'A <b>VTEP</b> wraps Ethernet frames into UDP and unwraps them. We enable the features, map <b>VLAN 10 → VNI 10010</b>, and bring up the <b>NVE</b> interface using <b>' + (MC() ? 'multicast (239.1.1.10)' : 'ingress replication') + '</b> for BUM traffic.', btn: "Let's configure it" }),
  steps: [
    { dev: 'leaf1', mirror: ['leaf2', 'border'],
      coach: { t: 'Enable the overlay features', b: 'Three switches that unlock VXLAN + EVPN. Applied to all three VTEPs.' },
      cmds: d => [
        { c: 'feature nv overlay', m: 'config', x: X('Enables the NVE (network virtualization edge) interface — the VTEP function.', 'Without it, <code>interface nve1</code> does not exist.') },
        { c: 'feature vn-segment-vlan-based', x: X('Allows mapping VLANs to VXLAN VNIs (<code>vn-segment</code>).', 'VLAN IDs are locally significant (12 bits). The VNI is the fabric-wide identifier (24 bits).') },
        { c: 'nv overlay evpn', x: X('Turns on the EVPN control plane for the overlay.', 'Selects BGP-EVPN for MAC/IP learning instead of flood-and-learn. This one line is the difference between “VXLAN” and “VXLAN EVPN”.') }
      ] },
    { dev: 'leaf1', mirror: ['leaf2', 'border'],
      coach: { t: 'Map the VLAN to a VNI', b: 'VLAN 10 is the tenant web segment. Its VXLAN identity will be <b>VNI 10010</b>.' },
      cmds: d => [
        { c: 'vlan 10', m: 'config-vlan', x: X('Creates VLAN 10 (the local broadcast domain).') },
        { c: 'name Tenant-A-Web', x: X('Human-readable name.') },
        { c: 'vn-segment 10010', cam: { n: 'stamper', at: { dev: 'leaf1' } }, x: X('Binds VLAN 10 to <b>L2VNI 10010</b>.', 'The VLAN number may differ per leaf as long as the VNI matches — the VNI is what remote VTEPs see. Convention: 10000 + VLAN keeps it readable.', 'Every VTEP in the same bridge domain must use the same VNI.') }
      ] },
    { dev: 'leaf1', mirror: ['leaf2', 'border'],
      coach: { t: 'Create the NVE interface', b: MC() ? 'Multicast BUM: the VNI is bound to group <b>239.1.1.10</b>. Watch Wireshark — the VTEP will <b>join the group</b> toward the RP.' : 'Ingress replication: BUM copies go to every remote VTEP. Watch Wireshark afterwards — and notice it stays quiet.' },
      cmds: d => [
        { c: 'interface nve1', m: 'config-if-nve', x: X('Creates the logical VTEP interface (NVE = Network Virtualization Edge).', 'There is exactly one NVE per switch; all VNIs hang off it.') },
        { c: 'no shutdown', x: X('Enables the NVE.') },
        { c: 'host-reachability protocol bgp', x: X('Learn remote MAC/IP reachability via BGP EVPN.', 'The alternative is <i>flood-and-learn</i> (data-plane learning). EVPN removes unknown-unicast flooding across the fabric.') },
        { c: 'source-interface loopback1', x: X('Use Loopback1 (<code>' + DEV[d].lo1 + '</code>) as the tunnel source.', 'This IP is the outer source address of every VXLAN packet and the next hop in EVPN routes.', 'If this interface or its route is missing, the NVE stays down: “Source-interface is down”.') },
        { c: 'member vni 10010', m: 'config-if-nve-vni', x: X('Attach L2VNI 10010 to this VTEP.', 'Each member VNI needs a BUM (broadcast / unknown-unicast / multicast) replication method.') },
        MC()
          ? { c: `mcast-group ${MCG}`, x: X(`BUM traffic for VNI 10010 is sent to multicast group <b>${MCG}</b>.`, 'One copy leaves the ingress leaf; the <b>underlay replicates</b> along the PIM tree. Efficient with many VTEPs — but needs PIM + RP in the underlay and group management (usually one group per VNI or a shared group).', 'All VTEPs in the VNI must use the SAME group, and the NVE loopback must run PIM.'),
              ev: d === 'leaf1' ? E([['leaf1', 'spine1']], 'VTEP joins the group', [P.pimJoin('leaf1', 'spine1', true)],
                'The VTEP sends a <b>PIM (*,G) Join</b> for <b>239.1.1.10</b> toward the RP (10.254.254.1) via the spine. Expand <b>Groups</b>: group, RP and the <b>S, WC, RPT</b> flags. This builds the shared tree BUM traffic will follow. Still no VXLAN packets — and still no VTEP peers.') : null }
          : { c: 'ingress-replication protocol bgp', x: X('BUM traffic is head-end replicated, with the remote-VTEP list learned from BGP (EVPN Type-3 routes).', 'No multicast needed in the underlay. Trade-off: the ingress leaf makes N copies of every broadcast — fine for small/medium fabrics; large ones may prefer multicast.'),
              ev: d === 'leaf1' ? E([], 'NVE up — Wireshark is quiet', [], 'Zero packets. The NVE is up and VNI 10010 exists, but there are <b>no peers</b>: the leaf doesn’t yet know any other VTEP. Peers come from the <b>BGP EVPN control plane</b> (Chapter 3). Meanwhile, the <b>Encapsulation</b> tab shows exactly what a VXLAN packet will look like.', { ws: 'encap', node: 'leaf1' }) : null }
      ] },
    { dev: 'leaf1', exec: true,
      coach: { t: 'Verify', b: 'Confirm the NVE, then see that there are no peers yet.' },
      cmds: d => [
        { c: 'show nve vni', x: X('Lists VNIs on the NVE.', MC() ? 'The Multicast-group column now shows the group instead of <b>UnicastBGP</b>.' : '<b>UnicastBGP</b> = ingress replication via BGP.'),
          out: ['Codes: CP - Control Plane        DP - Data Plane', '       UC - Unconditional...', '', 'Interface VNI      Multicast-group   State Mode Type [BD/VRF]      Flags', '--------- -------- ----------------- ----- ---- ------------------ -----', `nve1      10010    ${MC() ? MCG.padEnd(17) : 'UnicastBGP'.padEnd(17)} Up    CP   L2 [10]`] },
        { c: 'show nve peers', x: X('Lists remote VTEPs.', 'Empty! No peer is known until EVPN routes arrive.'), out: [] }
      ] }
  ],
  recap: () => ({ t: 'VTEP ready, no peers yet', pts: ['VLAN is local; <b>VNI</b> is the fabric-wide segment ID (24-bit).', 'NVE1 sources tunnels from Loopback1 and learns reachability from BGP.', MC() ? 'BUM = multicast group 239.1.1.10 — underlay replicates; the VTEP joined via a PIM (*,G).' : 'BUM = ingress (head-end) replication — peer list comes from EVPN Type-3 routes.'] })
});

/* ---------------------------------------------------------------- Chapter 3 : EVPN overlay (iBGP RR) */
CHAPTERS.push({
  id: 3, title: 'EVPN overlay', sub: 'iBGP RR · Type-3',
  intro: () => ({ t: 'Chapter 3 — The EVPN control plane', b: 'With an IGP underlay the natural overlay is <b>iBGP in a single AS (65000)</b>. The spines become <b>route reflectors</b>: leaves peer only with them, so there is no full mesh. Then each leaf advertises a <b>Type-3 (Inclusive Multicast)</b> route, so every VTEP learns who else is in VNI 10010.', btn: "Let's configure it" }),
  steps: [
    { dev: 'spine1', mirror: ['spine2'],
      coach: { t: 'Spines first: route reflectors', b: 'iBGP needs a full mesh — or reflectors. Each spine reflects EVPN routes between its leaf clients without ever becoming a VTEP.' },
      cmds: d => {
        const o = [
          { c: 'feature bgp', m: 'config', x: X('Enables the BGP process.', 'Like OSPF, BGP is off until you enable it. Without it <code>router bgp</code> is rejected.') },
          { c: 'nv overlay evpn', x: X('Allows the L2VPN EVPN address-family on this switch.') },
          { c: 'router bgp 65000', m: 'config-router', x: X('All switches — spines AND leaves — share AS 65000.', 'Same AS = <b>iBGP</b>: no AS-path prepending, no multihop, and the next hop is never rewritten by a reflector.') },
          { c: `router-id ${DEV[d].lo0}` },
          { c: 'address-family l2vpn evpn', m: 'config-router-af', x: X('Enter the EVPN address-family.') },
          { c: 'retain route-target all', x: X('Keep EVPN routes even though no local VRF/EVI imports their route-target.', 'A spine imports nothing, and NX-OS discards routes whose RTs it does not import. Required on route servers (eBGP) and used on RR spines so nothing is filtered.', 'Symptom when missing: sessions are Established but few/no prefixes are reflected.') },
          { c: 'exit', m: 'config-router' }
        ];
        LF.forEach((l, i) => {
          o.push({ c: `neighbor ${DEV[l].lo0}`, m: 'config-router-neighbor', x: i === 0 ? X(`Peer to ${N(l)} Loopback0 (<code>${DEV[l].lo0}</code>), not the /31.`, 'Overlay sessions are loopback-to-loopback and ride the OSPF ECMP underlay. A single link failure never resets them.') : null });
          o.push({ c: 'remote-as 65000', x: i === 0 ? X('Same AS → iBGP session.') : null });
          o.push({ c: 'update-source loopback0', x: i === 0 ? X('Source the TCP session from Loopback0.', 'The leaf expects to be contacted by this address.') : null });
          o.push({ c: 'address-family l2vpn evpn', m: 'config-router-neighbor-af' });
          o.push({ c: 'send-community extended', x: i === 0 ? X('Send <b>extended</b> communities.', 'Route-targets, the VXLAN encapsulation type and the router MAC all travel as extended communities. Without this, EVPN routes arrive but nobody imports them.') : null });
          o.push({ c: 'route-reflector-client', cam: i === 0 ? { n: 'mirror', at: { dev: d } } : undefined, x: i === 0 ? X(`Make ${N(l)} a route-reflector client.`, 'iBGP normally refuses to re-advertise a route learned from an iBGP peer to another iBGP peer. The RR relaxes that rule — it adds ORIGINATOR_ID and CLUSTER_LIST for loop prevention.', 'Without it, Leaf-1’s routes never reach Leaf-2.') : null });
          o.push({ c: 'exit', m: 'config-router-neighbor' });
          o.push({ c: 'exit', m: 'config-router' });
        });
        return o;
      } },
    { dev: 'leaf1', mirror: ['leaf2', 'border'],
      coach: { t: 'Leaves peer to both spines', b: 'Same rules from the other side. When the first neighbor activates, watch the OPEN message carefully.' },
      cmds: d => {
        const o = [
          { c: 'feature bgp', m: 'config', x: X('Enables the BGP process on this leaf.') },
          { c: 'router bgp 65000', m: 'config-router' },
          { c: `router-id ${DEV[d].lo0}` },
          { c: 'address-family l2vpn evpn', m: 'config-router-af', x: X('Enable the EVPN address-family globally.') },
          { c: 'exit', m: 'config-router' }
        ];
        SPN.forEach((s, i) => {
          o.push({ c: `neighbor ${DEV[s].lo0}`, m: 'config-router-neighbor', x: i === 0 ? X(`Peer to ${N(s)} Loopback0.`) : null });
          o.push({ c: 'remote-as 65000' });
          o.push({ c: 'update-source loopback0' });
          const af = { c: 'address-family l2vpn evpn', m: 'config-router-neighbor-af', x: i === 0 ? X('Negotiate the EVPN address-family with the spine.', 'Capabilities are exchanged in the BGP OPEN message — watch it in Wireshark.') : null };
          if (d === 'leaf1' && i === 0) af.ev = E([['leaf1', 'spine1']], 'EVPN session negotiated', [
            P.tcpSyn('leaf1', 'spine1', 'over'), P.tcpSynAck('spine1', 'leaf1', 'over'), P.tcpAck('leaf1', 'spine1', 'over'),
            P.bgpOpen('leaf1', 'spine1', 'over', { evpn: true, key: true, keyAs: true }), P.bgpOpen('spine1', 'leaf1', 'over', { evpn: true }),
            P.bgpKeepalive('spine1', 'leaf1', 'over'), P.bgpKeepalive('leaf1', 'spine1', 'over')],
            'Expand the OPEN → Optional Parameters → <b>Multiprotocol extensions: AFI 25 (L2VPN), SAFI 70 (EVPN)</b>. Note <b>My AS = 65000</b> on both sides (iBGP) and the IP header: <b>10.0.0.11 → 10.0.0.1, TTL 255</b> — loopback-to-loopback, no multihop knob needed.');
          o.push(af);
          o.push({ c: 'send-community extended', x: i === 0 ? X('Send extended communities (route-targets).') : null });
          o.push({ c: 'exit', m: 'config-router-neighbor' });
          o.push({ c: 'exit', m: 'config-router' });
        });
        return o;
      } },
    { dev: 'leaf1', mirror: ['leaf2', 'border'],
      coach: { t: 'Define the EVPN instance and advertise', b: 'The <code>evpn</code> section controls how VNI 10010 is advertised: its <b>RD</b> and <b>route-targets</b>.' },
      cmds: d => [
        { c: 'evpn', m: 'config-evpn', x: X('Enter EVPN instance configuration.') },
        { c: 'vni 10010 l2', m: 'config-evpn-evi', x: X('Declare L2VNI 10010 as an EVPN instance.', 'This ties the bridge-domain (VLAN 10) to the BGP control plane.') },
        { c: 'rd auto', x: X('Route-Distinguisher generated automatically: <code>' + DEV[d].lo0 + ':32777</code>.', 'RD = router-id : (VLAN + 32767). It makes each leaf’s routes <b>unique</b> in the BGP table even if two leaves advertise the same MAC.') },
        { c: 'route-target import auto', x: X('Import routes tagged with the auto RT <code>65000:10010</code>.', 'Auto RT = AS : VNI. Because the whole fabric is one AS (iBGP) every leaf computes the same RT, so “auto” just works.', 'In an eBGP fabric with a different AS per leaf, auto RTs would NOT match — you would need manual RTs or rewrite-evpn-rt-asn.') },
        { c: 'route-target export auto', x: X('Tag our routes with RT 65000:10010.'),
          ev: d === 'leaf1' ? E([['leaf1', 'spine1'], ['spine1', 'leaf2']], 'EVPN Type-3 (IMET) route', [
            P.bgpUpdateEvpn('leaf1', 'spine1', 3, { origin: 'leaf1', key: true }),
            P.bgpUpdateEvpn('spine1', 'leaf2', 3, { origin: 'leaf1', reflected: true })],
            'Expand <b>MP_REACH_NLRI → EVPN NLRI</b>: <b>Route Type 3</b>, originating router <b>10.1.1.1</b>, and the <b>PMSI Tunnel</b> attribute: ' + (MC() ? '<i>PIM-SM tree</i> (BUM follows the multicast group).' : '<i>Ingress Replication</i> (“send me BUM unicast copies”).') + ' Then compare the 2nd packet (Spine-1 → Leaf-2): the RR added <b>ORIGINATOR_ID</b> and <b>CLUSTER_LIST</b>, but the <b>next hop is still 10.1.1.1</b>.') : null }
      ] },
    { dev: 'leaf1', exec: true,
      coach: { t: 'Verify peers appear', b: 'Remote VTEPs now show up — learned purely from BGP.' },
      cmds: d => [
        { c: 'show bgp l2vpn evpn summary', x: X('EVPN neighbor status.'),
          out: ['BGP summary information for VRF default, address family L2VPN EVPN', 'BGP router identifier 10.0.0.11, local AS number 65000', '', 'Neighbor        V    AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd', '10.0.0.1        4 65000      21      19        9    0    0 00:04:02 2', '10.0.0.2        4 65000      21      19        9    0    0 00:04:01 2'] },
        { c: 'show bgp l2vpn evpn route-type 3', x: X('Lists inclusive-multicast routes.', 'One per VTEP per VNI — it is the list of who participates in the VNI' + (MC() ? ' (and which tree carries BUM).' : ' and where ingress-replicated BUM goes.')),
          out: ['Route Distinguisher: 10.0.0.11:32777    (L2VNI 10010)', 'BGP routing table entry for [3]:[0]:[32]:[10.1.1.1]/88, version 3', '    Path type: local, path is valid, is best path', '    AS-Path: NONE, path locally originated', '      10.1.1.1 (metric 0) from 0.0.0.0 (10.0.0.11)', '        Extcommunity: RT:65000:10010 ENCAP:8',
            MC() ? '        PMSI Tunnel Attribute: Tunnel type: PIM-SM Tree, Tunnel ID: 239.1.1.10' : '        PMSI Tunnel Attribute: Tunnel type: Ingress Replication, Label: 10010', '', 'Route Distinguisher: 10.0.0.12:32777', 'BGP routing table entry for [3]:[0]:[32]:[10.1.1.2]/88, version 6', '    Paths: (2 available, best #1)', '    Path type: internal, path is valid, is best path', '    AS-Path: NONE, path sourced internal to AS', '      10.1.1.2 (metric 3) from 10.0.0.1 (10.0.0.1)', '        Originator: 10.0.0.12 Cluster list: 10.0.0.1'] },
        { c: 'show nve peers', x: X('Remote VTEPs — now populated.', 'State <b>Up</b> + LearnType <b>CP</b> = reachable and learned via the control plane.'),
          out: ['Interface Peer-IP          State LearnType Uptime   Router-Mac', '--------- ---------------  ----- --------- -------- -----------------', 'nve1      10.1.1.2         Up    CP        00:00:42 n/a', 'nve1      10.1.1.3         Up    CP        00:00:42 n/a'] }
      ] }
  ],
  recap: () => ({ t: 'Control plane is up', pts: ['iBGP in one AS: the spines are <b>route reflectors</b> (ORIGINATOR_ID + CLUSTER_LIST), next hop untouched.', 'EVPN = BGP address-family AFI 25 / SAFI 70, negotiated in the OPEN.', '<b>Type-3</b> routes list every VTEP in the VNI → peers appear.', 'Same AS ⇒ <code>route-target auto</code> works (AS:VNI).'] })
});

/* ---------------------------------------------------------------- Chapter 4 : Multihoming */
CHAPTERS.push({
  id: 4, title: 'Multihoming', sub: 'ESI · Type-1/4',
  intro: () => ({ t: 'Chapter 4 — Dual-homing Host-A with EVPN', b: 'Host-A connects to <b>both</b> Leaf-1 and Leaf-2 with one LACP bundle — no vPC peer-link. Both leaves present the <b>same LACP system-ID</b>, defining an <b>Ethernet Segment (ESI)</b>. EVPN then advertises <b>Type-4</b> (segment) and <b>Type-1</b> (auto-discovery) routes.', btn: "Let's configure it" }),
  steps: [
    { dev: 'leaf1', mirror: ['leaf2'],
      coach: { t: 'Define the Ethernet Segment on both leaves', b: 'Identical <code>evpn multihoming</code> system-mac and <code>ethernet-segment</code> on Leaf-1 and Leaf-2 — Leaf-2 is applied silently.' },
      cmds: d => {
        const o = [
          { c: 'feature lacp', m: 'config', x: X('Enables LACP so <code>channel-group … mode active</code> works.', 'The Nexus rejects <code>mode active</code> until this feature is on.') },
          { c: 'evpn multihoming', m: 'config-evpn-mh', x: X('Enables EVPN Ethernet-Segment multihoming and enters its sub-mode.', 'Replaces vPC/MC-LAG for access-side redundancy: standards-based, no peer-link, works with more than 2 leaves.', 'Needs a TCAM carve (<code>hardware access-list tcam region ing-flow-redirect 512</code>) and a reload on supported platforms (9300-FX2/FX3/GX…). Check the platform guide for your release.') },
          { c: 'system-mac 0000.0000.0010', x: X('Global ES system-MAC used to build Type-3 ESIs <b>and</b> presented as the LACP system-ID.', 'ESI = 03 | system-mac | local discriminator. Both leaves present the same value, so the host sees one switch.', 'Must be identical on every leaf in the segment.') },
          { c: 'df-election mode modulo', x: X('Designated-Forwarder election by VLAN modulo the number of ES leaves.', 'The DF alone forwards BUM into the segment so the host doesn’t get duplicate copies. Other modes (preference, per-flow) exist in newer releases.') },
          { c: 'exit', m: 'config' }
        ];
        UPL[d].forEach((u, i) => {
          o.push({ c: `interface ${u.ifc}`, m: 'config-if' });
          o.push({ c: 'evpn multihoming core-tracking', x: i === 0 ? X('Track this uplink for the Ethernet Segment.', 'If ALL core links fail, the leaf shuts its ES-facing ports so the host fails over to the other leaf instead of black-holing traffic. Required for the ES to come up.') : null });
        });
        o.push({ c: 'router bgp 65000', m: 'config-router' });
        o.push({ c: 'address-family l2vpn evpn', m: 'config-router-af' });
        o.push({ c: 'maximum-paths ibgp 4', x: X('Allow ECMP over multiple iBGP EVPN next hops.', 'Needed so a remote leaf can install BOTH Leaf-1 and Leaf-2 as next hops for an ESI (aliasing / load-balancing).') });
        o.push({ c: 'exit', m: 'config-router' }); o.push({ c: 'exit', m: 'config' });
        o.push({ c: 'interface port-channel10', m: 'config-if', x: X('Create the bundle toward Host-A.') });
        o.push({ c: 'switchport' }); o.push({ c: 'switchport mode access' });
        o.push({ c: 'switchport access vlan 10', x: X('Host traffic lands in VLAN 10 (VNI 10010).') });
        o.push({ c: 'ethernet-segment', m: 'config-if-ethernet-segment', x: X('Marks this port-channel as an EVPN Ethernet Segment.') });
        o.push({ c: 'esi system-mac 10', cam: { n: 'twins', at: { link: ['leaf1', 'leaf2'], dy: -48 } }, x: X('Type-3 ESI: global system-mac + local discriminator <b>10</b>.', 'Result: ESI <code>0300.0000.0000.1000.000a</code>. Same on both leaves → they know they share the segment.') });
        o.push({ c: 'exit', m: 'config-if' });
        o.push({ c: 'interface Ethernet1/10', m: 'config-if', x: X('Physical port toward Host-A.') });
        o.push({ c: 'switchport' }); o.push({ c: 'switchport mode access' }); o.push({ c: 'switchport access vlan 10' });
        o.push({ c: 'channel-group 10 mode active', x: X('Put the port into LACP bundle 10 (active).') });
        o.push({ c: 'no shutdown' });
        return o;
      } },
    { dev: 'host', mirror: [],
      coach: { t: 'Bring up the host bond', b: 'Host-A runs Linux. It builds an <b>802.3ad (LACP)</b> bond across both NICs. Watch both leaves send the <b>same system ID</b>.' },
      cmds: d => [
        { c: 'ip link add bond0 type bond mode 802.3ad lacp_rate fast', x: X('Create an LACP bond with fast (1 s) LACPDUs.') },
        { c: 'ip link set eth0 master bond0', x: X('Enslave NIC 0 (cabled to Leaf-1).') },
        { c: 'ip link set eth1 master bond0', x: X('Enslave NIC 1 (cabled to Leaf-2).') },
        { c: 'ip link set bond0 up', x: X('Bring the bond up — LACP negotiation starts.'),
          ev: [
            E([['host', 'leaf1'], ['host', 'leaf2']], 'LACP negotiation', [
              P.lacp('host', DEV.host.mac, '00:00:00:00:00:10', ['host', 'leaf1']),
              P.lacp('leaf1', '00:00:00:00:00:10', DEV.host.mac, ['host', 'leaf1'], true),
              P.lacp('leaf2', '00:00:00:00:00:10', DEV.host.mac, ['host', 'leaf2'], true)],
              'Compare the two LACPDUs coming from the leaves: <b>Actor System = 00:00:00:00:00:10 on BOTH</b>, from two different switches. Host-A thinks it is cabled to one switch and happily bundles both links.'),
            E([['leaf1', 'spine1']], 'EVPN Type-4 + Type-1 routes', [
              P.bgpUpdateEvpn('leaf1', 'spine1', 4, { origin: 'leaf1', key: true }),
              P.bgpUpdateEvpn('leaf1', 'spine1', '1ES', { origin: 'leaf1' }),
              P.bgpUpdateEvpn('leaf1', 'spine1', '1EVI', { origin: 'leaf1' })],
              '<b>Type-4</b> (Ethernet Segment route): carries the <b>ES-Import RT</b>, so only leaves on the same ESI import it → they find each other and run the <b>DF election</b>. <b>Type-1 per-ES</b> (tag 0xFFFFFFFF): enables <i>mass withdrawal</i> — one withdrawal says “all MACs behind this ES via me are gone”. <b>Type-1 per-EVI</b>: enables <i>aliasing</i> — remote leaves can load-balance to either leaf even if only one learned a MAC.')
          ] }
      ] },
    { dev: 'leaf1', exec: true,
      coach: { t: 'Verify the segment', b: 'Check the bundle, the ES state and who is the Designated Forwarder.' },
      cmds: d => [
        { c: 'show port-channel summary', x: X('Bundle status.', 'Look for <b>(SU)</b> — Switched, Up — and member flag <b>(P)</b>.'),
          out: ['Group Port-       Type     Protocol  Member Ports', '      Channel', '--------------------------------------------------------------------', '10    Po10(SU)    Eth      LACP      Eth1/10(P)'] },
        { c: 'show nve ethernet-segment', x: X('EVPN Ethernet Segment state.', '<b>DF List</b> shows both leaves; DF election for VLAN 10 uses modulo (VLAN mod N). The DF alone forwards BUM into the segment.'),
          out: ['ESI: 0300.0000.0000.1000.000a', '   Parent interface: port-channel10', '  ES State: Up', '  NVE Interface: nve1', '  Active Vlans: 10', '   DF Vlans: 10', '   Active VNIs: 10010', '  Number of ES members: 2', '  My ordinal: 0', '  DF List: 10.1.1.1 10.1.1.2'] },
        { c: 'show bgp l2vpn evpn route-type 4', x: X('Ethernet-Segment routes.', 'One per ES per leaf. The remote entry is how Leaf-1 learns Leaf-2 shares the segment.'),
          out: ['Route Distinguisher: 10.0.0.11:3    (ES [0300.0000.0000.1000.000a 0])', 'BGP routing table entry for [4]:[0300.0000.0000.1000.000a]:[32]:[10.1.1.1]/136, version 8', '    Path type: local, path is valid, is best path', '      10.1.1.1 (metric 0) from 0.0.0.0 (10.0.0.11)', '        Extcommunity: ENCAP:8 ES-IMPORT-RT:0000.0000.0010', '', 'Route Distinguisher: 10.0.0.12:3', 'BGP routing table entry for [4]:[0300.0000.0000.1000.000a]:[32]:[10.1.1.2]/136, version 12', '    Paths: (2 available, best #1)  AS-Path: NONE', '      10.1.1.2 (metric 3) from 10.0.0.1 (10.0.0.1)'] }
      ] }
  ],
  recap: () => ({ t: 'Multihoming ready', pts: ['<b>ESI</b> identifies a segment shared by several leaves; both present the same LACP system-ID.', '<b>Type-4</b> → peer discovery + DF election. <b>Type-1</b> → mass withdrawal + aliasing.', 'No vPC peer-link: all-active forwarding built purely on EVPN routes. Core-tracking protects against isolation.'] })
});

/* ---------------------------------------------------------------- Chapter 5 : Host learning / BUM */
CHAPTERS.push({
  id: 5, title: 'Host learning', sub: 'GARP → Type-2, BUM',
  intro: () => ({ t: 'Chapter 5 — A host speaks', b: 'Host-A sends a <b>gratuitous ARP</b>. We follow that one broadcast through three mechanisms: <b>local MAC learning</b>, <b>BUM replication in VXLAN</b> (your first real VXLAN packets — via <b>' + (MC() ? 'multicast' : 'ingress replication') + '</b>) and the <b>EVPN Type-2 route</b>. Flip the BUM selector in the top bar and replay this chapter to compare.', btn: "Let's watch it" }),
  steps: [
    { dev: 'host', mirror: [],
      coach: { t: 'Send one broadcast', b: 'A gratuitous ARP is the simplest way to make a host announce its MAC.' },
      cmds: d => [
        { c: 'ip addr add 10.1.10.10/24 dev bond0', x: X('Give the bond an address in VLAN 10’s subnet.') },
        { c: 'arping -U -I bond0 -c 1 10.1.10.10', cam: MC() ? { n: 'sprinkler', at: { dev: 'spine1' } } : { n: 'copycat', at: { dev: 'leaf1' } },
          x: X('Send an unsolicited (gratuitous) ARP announcing 10.1.10.10 / 00:50:56:aa:10:10.', 'A broadcast frame → exercises <b>learning</b> and <b>BUM replication</b> at once.'),
          ev: [
            E([['host', 'leaf1']], '① Frame hits Leaf-1', [P.garp(['host', 'leaf1'], true)],
              'LACP hashed this frame onto the <b>Leaf-1</b> member link. Leaf-1 learns <b>source MAC 00:50:56:aa:10:10 on port-channel10, VLAN 10</b>. The ARP is a <b>broadcast</b>, so it must flood within VNI 10010.'),
            MC()
              ? E([['leaf1', 'spine1']], '② ONE multicast VXLAN packet', [P.vxlanGarpMc('leaf1', 'spine1', true)],
                  'First <b>real VXLAN packet</b> — and there is <b>exactly one</b>. Outer destination is the <b>group 239.1.1.10</b> (outer dst MAC is the mapped multicast MAC), UDP <b>4789</b>, VNI <b>10010</b>. The <b>spines replicate</b> it along the PIM tree to every VTEP that joined. Compare with ingress-replication mode, where Leaf-1 itself sends one copy per VTEP.', { ws: 'packets' })
              : E([['leaf1', 'spine1'], ['leaf1', 'spine2']], '② Ingress replication (2 copies)', [P.vxlanGarp('leaf1', 'spine1', DEV.leaf2.lo1, true), P.vxlanGarp('leaf1', 'spine2', DEV.border.lo1)],
                  'First <b>real VXLAN packets</b>! Leaf-1 made <b>one unicast copy per remote VTEP</b> (head-end replication): outer dst <b>10.1.1.2</b> and <b>10.1.1.3</b>, UDP <b>4789</b>, VNI <b>10010</b>. The two copies hashed to different spines (different UDP source ports). With 100 VTEPs it would send 99 copies — that is the cost of this mode. Open the <b>Encapsulation</b> tab for the byte layout.', { ws: 'packets' }),
            E([['leaf1', 'spine1'], ['spine1', 'leaf2']], '③ EVPN Type-2 (MAC) route', [
              P.bgpUpdateEvpn('leaf1', 'spine1', 2, { origin: 'leaf1', key: true }),
              P.bgpUpdateEvpn('spine1', 'leaf2', 2, { origin: 'leaf1', reflected: true })],
              'Learning triggers a <b>Type-2 MAC advertisement</b>. See <b>ESI</b> = the segment from Chapter 4 and the <b>label = VNI 10010</b>. Because Leaf-2 shares this ESI it can reach the host <i>locally</i> — it won’t tunnel back to Leaf-1 for this MAC. IP length is 0: MAC-only for now.')
          ] }
      ] },
    { dev: 'leaf1', exec: true,
      coach: { t: 'See what Leaf-1 learned', b: 'Local MAC table first, then the EVPN L2RIB.' },
      cmds: d => [
        { c: 'show mac address-table vlan 10', x: X('Local MAC table.'),
          out: ['Legend: * - primary entry, G - Gateway MAC, (R) - Routed MAC, O - Overlay MAC', '   VLAN     MAC Address      Type      age     Secure NTFY Ports', '---------+-----------------+--------+---------+------+----+------------------', '*   10     0050.56aa.1010   dynamic  0         F    F  Po10'] },
        { c: 'show l2route evpn mac all', x: X('Shows the L2RIB — what the MAC table feeds into BGP.'),
          out: ['Topology    Mac Address    Prod   Flags         Seq No     Next-Hops', '----------- -------------- ------ ------------- ---------- ---------------', '10          0050.56aa.1010 Local  L,            0          Po10'] }
      ] },
    { dev: 'leaf2', exec: true,
      coach: { t: 'Now Leaf-2 — it never saw the frame', b: 'The host’s frame was hashed to Leaf-1. Does Leaf-2 still know the MAC?' },
      cmds: d => [
        { c: 'show bgp l2vpn evpn route-type 2', x: X('Type-2 routes in the BGP table.', 'Two paths — one via each spine/RR — both with the <b>same next hop 10.1.1.1</b>, plus ORIGINATOR_ID and CLUSTER_LIST.'),
          out: ['Route Distinguisher: 10.0.0.11:32777', 'BGP routing table entry for [2]:[0300.0000.0000.1000.000a]:[0]:[48]:[0050.56aa.1010]:[0]:[0.0.0.0]/216, version 5', 'Paths: (2 available, best #1)', '    Path type: internal, path is valid, is best path', '    AS-Path: NONE, path sourced internal to AS', '      10.1.1.1 (metric 3) from 10.0.0.1 (10.0.0.1)', '        Received label 10010', '        Extcommunity: RT:65000:10010 ENCAP:8', '        Originator: 10.0.0.11 Cluster list: 10.0.0.1', '    Path type: internal, path is valid', '      10.1.1.1 (metric 3) from 10.0.0.2 (10.0.0.2)', '        Originator: 10.0.0.11 Cluster list: 10.0.0.2'] }
      ] }
  ],
  recap: () => ({ t: 'First end-to-end flow', pts: ['Local learning → Type-2 route. MACs are advertised by BGP, not flooded and re-learned.', MC() ? 'BUM went out as <b>ONE multicast VXLAN packet</b>; the spines replicated it.' : 'BUM went out as <b>one unicast VXLAN copy per remote VTEP</b> (ingress replication).', 'Type-2 with an <b>ESI</b> lets every leaf on the segment reach the host locally.', 'Replay this chapter with the other BUM mode (top bar) to compare the wire behaviour.', 'Next: distributed anycast gateway and <b>symmetric IRB</b> with an L3VNI.'] })
});

/* ---------------------------------------------------------------- Chapter 6 : Symmetric IRB */
CHAPTERS.push({
  id: 6, title: 'Symmetric IRB', sub: 'Anycast GW · L3VNI',
  intro: () => ({ t: 'Chapter 6 — Routing in the overlay', b: 'So far the fabric <b>bridges</b>. Now we <b>route</b>: every leaf gets the same <b>distributed anycast gateway</b> (10.1.10.1, one shared MAC), and the tenant gets a VRF with an <b>L3VNI (50001)</b>. With <b>symmetric IRB</b> both the ingress and egress leaf do a bridge-AND-route lookup, and all routed traffic travels in the L3VNI.', btn: "Let's configure it" }),
  steps: [
    { dev: 'leaf1', mirror: ['leaf2', 'border'],
      coach: { t: 'Enable the IRB features', b: 'Interface-VLANs, fabric forwarding — and the one MAC that every leaf will use for the gateway.' },
      cmds: d => [
        { c: 'feature interface-vlan', m: 'config', x: X('Enables SVIs (interface VlanX) — the routed face of a VLAN.') },
        { c: 'feature fabric forwarding', x: X('Enables the distributed anycast gateway.') },
        { c: `fabric forwarding anycast-gateway-mac ${ANYCAST_GW_MAC}`, x: X('Defines the <b>one MAC</b> used by every anycast-gateway SVI in the fabric.', 'The host ARPs for 10.1.10.1 and always gets <b>this</b> MAC, no matter which leaf answers. When a VM moves, nothing needs to re-ARP.', 'Must be identical on every leaf.') }
      ] },
    { dev: 'leaf1', mirror: ['leaf2', 'border'],
      coach: { t: 'Create the tenant VRF and the L3VNI', b: 'The L3VNI is the VXLAN segment used for <b>routed</b> traffic between VTEPs. It belongs to a VRF, not to a subnet.' },
      cmds: d => [
        { c: 'vlan 3500', m: 'config-vlan', x: X('A transit VLAN just to carry the L3VNI.') },
        { c: 'name L3VNI-Tenant-A' },
        { c: 'vn-segment 50001', x: X('Binds VLAN 3500 to <b>L3VNI 50001</b>.', 'Classic NX-OS needs this VLAN→VNI binding plus an SVI. (NX-OS 10.2(3)F+ has a “new L3VNI mode” without the VLAN/SVI — same behaviour on the wire.)') },
        { c: 'vrf context Tenant-A', m: 'config-vrf', x: X('Creates the tenant VRF — an isolated routing table.') },
        { c: 'vni 50001', x: X('Associates VRF Tenant-A with L3VNI 50001.', 'Every routed packet for Tenant-A is carried in VNI 50001 between VTEPs.') },
        { c: 'rd auto', x: X('Auto RD for the VRF (router-id : 3 for the first VRF).') },
        { c: 'address-family ipv4 unicast', m: 'config-vrf-af-ipv4' },
        { c: 'route-target both auto', x: X('Import/export RT 65000:50001 for IPv4 routes (L3 RT).') },
        { c: 'route-target both auto evpn', x: X('Same RT, but for the EVPN address-family.', 'This is what lets BGP-EVPN Type-2 (with IP) and Type-5 routes populate this VRF.') },
        { c: 'exit', m: 'config-vrf' }, { c: 'exit', m: 'config' },
        { c: 'interface Vlan3500', m: 'config-if', x: X('The SVI that represents the L3VNI.') },
        { c: 'no shutdown' },
        { c: 'vrf member Tenant-A', x: X('Place the SVI in the tenant VRF.') },
        { c: 'ip forward', x: X('Enable IP forwarding on this SVI <b>without an IP address</b>.', 'The L3VNI SVI never needs an address; it only has to route.') },
        { c: 'no ip redirects' },
        { c: 'interface nve1', m: 'config-if-nve' },
        { c: 'member vni 50001 associate-vrf', x: X('Add the L3VNI to the NVE, associated with the VRF.', 'Unlike an L2 member VNI, an L3VNI has <b>no BUM</b> — no ingress replication or mcast-group.'),
          ev: d === 'leaf1' ? E([], 'L3VNI up — again, silent', [], 'Another quiet moment: an L3VNI carries only routed unicast, so there is nothing to flood or advertise yet. The Type-2/Type-5 routes that <i>use</i> it come next.', { node: 'leaf1' }) : null }
      ] },
    { dev: 'leaf1', mirror: ['leaf2', 'border'],
      coach: { t: 'The anycast gateway SVI', b: 'Same IP, same MAC, on every leaf — a first-hop gateway that lives <b>everywhere</b>.' },
      cmds: d => [
        { c: 'interface Vlan10', m: 'config-if', x: X('The gateway SVI for VLAN 10 (VNI 10010).') },
        { c: 'no shutdown' },
        { c: 'vrf member Tenant-A', x: X('Place the subnet in the tenant VRF.') },
        { c: `ip address ${GW_IP}/24`, x: X('The gateway address — <b>identical</b> on every leaf.', 'Normal IP rules forbid duplicate addresses; the anycast-gateway feature makes it legal and safe.') },
        { c: 'fabric forwarding mode anycast-gateway', cam: [{ n: 'gatekeeper', at: { dev: 'leaf1' } }, { n: 'gatekeeper', at: { dev: 'leaf2' } }], x: X('Use the fabric’s anycast-gateway MAC for this SVI.', 'Host ARPs for 10.1.10.1 are answered locally by whichever leaf receives them: first-hop latency is one hop, always.') }
      ] },
    { dev: 'leaf1', mirror: ['leaf2', 'border'],
      coach: { t: 'Advertise the VRF into EVPN', b: 'Tell BGP to export the tenant’s routes as EVPN <b>Type-5</b> routes.' },
      cmds: d => [
        { c: 'route-map RM-CONNECTED permit 10', m: 'config-route-map', x: X('A permit-all policy for connected routes.') },
        { c: 'router bgp 65000', m: 'config-router' },
        { c: 'vrf Tenant-A', m: 'config-router-vrf', x: X('BGP sub-section for the tenant VRF.') },
        { c: 'address-family ipv4 unicast', m: 'config-router-vrf-af' },
        { c: 'advertise l2vpn evpn', x: X('Export this VRF’s IPv4 routes into EVPN (as Type-5) and import EVPN routes into it.', 'Without it, the VRF is an island: no external or remote subnet is ever advertised or learned.') },
        { c: 'redistribute direct route-map RM-CONNECTED', x: X('Inject the connected subnet 10.1.10.0/24 into BGP.',  'This is how the subnet becomes a <b>Type-5</b> route — useful for silent hosts that have not ARPed yet.'),
          ev: d === 'leaf1' ? E([['leaf1', 'spine1'], ['spine1', 'leaf2']], 'EVPN Type-5 (IP prefix)', [
            P.bgpUpdateEvpn('leaf1', 'spine1', 5, { origin: 'leaf1', prefix: '10.1.10.0', plen: 24, key: true }),
            P.bgpUpdateEvpn('spine1', 'leaf2', 5, { origin: 'leaf1', reflected: true, prefix: '10.1.10.0', plen: 24 })],
            'First <b>Type-5</b>: a whole <b>prefix</b> (10.1.10.0/24), label = <b>L3VNI 50001</b>, RT <b>65000:50001</b> and the <b>Router’s MAC</b> extended community. Expand <b>MP_REACH → NLRI</b> and <b>EXTENDED_COMMUNITIES</b>.') : null }
      ] },
    { dev: 'host', mirror: [],
      coach: { t: 'Host talks to its gateway', b: 'Host-A ARPs for 10.1.10.1. Watch the <b>anycast MAC</b> come back, and the leaf learn the host’s <b>IP</b> too.' },
      cmds: d => [
        { c: 'ip route add default via 10.1.10.1', x: X('Point the host at the anycast gateway.') },
        { c: 'ping -c 2 10.1.10.1',
          x: X('Ping the gateway — forces an ARP exchange.'),
          out: ['PING 10.1.10.1 (10.1.10.1) 56(84) bytes of data.', '64 bytes from 10.1.10.1: icmp_seq=1 ttl=64 time=0.41 ms', '64 bytes from 10.1.10.1: icmp_seq=2 ttl=64 time=0.33 ms'],
          ev: [
            E([['host', 'leaf1']], '① ARP for the gateway', [P.arp(['host', 'leaf1'], 'req'), P.arp(['host', 'leaf1'], 'rep', true)],
              'Host-A broadcasts <b>“Who has 10.1.10.1?”</b>. Leaf-1 answers immediately from the SVI with the <b>anycast MAC 0000.2222.3333</b>. The same answer would come from Leaf-2. (Without ARP suppression the request is also flooded across the fabric — Chapter 10.)'),
            E([['leaf1', 'spine1'], ['spine1', 'leaf2']], '② EVPN Type-2 MAC+IP', [
              P.bgpUpdateEvpn('leaf1', 'spine1', '2IP', { origin: 'leaf1', key: true }),
              P.bgpUpdateEvpn('spine1', 'leaf2', '2IP', { origin: 'leaf1', reflected: true })],
              'The ARP gave Leaf-1 the host’s <b>IP</b>, so the Type-2 is re-advertised as <b>MAC + IP</b>. Look for the symmetric-IRB signature: <b>two labels</b> (L2VNI 10010 <i>and</i> L3VNI 50001), <b>two RTs</b> (65000:10010 and 65000:50001) and the <b>Router’s MAC</b> extended community.')
          ] }
      ] },
    { dev: 'leaf2', exec: true,
      coach: { t: 'What Leaf-2 now knows about Host-A', b: 'A /32 host route in the VRF, pointing across the L3VNI.' },
      cmds: d => [
        { c: 'show nve vni', x: X('Both VNIs now listed.', 'Type <b>L2</b> for the bridge-domain VNI, <b>L3</b> for the VRF VNI.'),
          out: ['Interface VNI      Multicast-group   State Mode Type [BD/VRF]      Flags', '--------- -------- ----------------- ----- ---- ------------------ -----', `nve1      10010    ${MC() ? MCG.padEnd(17) : 'UnicastBGP'.padEnd(17)} Up    CP   L2 [10]`, 'nve1      50001    n/a               Up    CP   L3 [Tenant-A]'] },
        { c: 'show ip route vrf Tenant-A', x: X('The tenant routing table.', 'The host route arrived via EVPN: <b>segid 50001</b>, <b>tunnelid 0xa010101</b> (= 10.1.1.1, Leaf-1’s VTEP), <b>encap VXLAN</b>.'),
          out: ['IP Route Table for VRF "Tenant-A"', '10.1.10.0/24, ubest/mbest: 1/0, attached', '    *via 10.1.10.1, Vlan10, [0/0], 00:02:40, direct', '10.1.10.1/32, ubest/mbest: 1/0, attached', '    *via 10.1.10.1, Vlan10, [0/0], 00:02:40, local', '10.1.10.10/32, ubest/mbest: 1/0', '    *via 10.1.1.1%default, [200/0], 00:00:31, bgp-65000, internal, tag 65000 (evpn) segid: 50001 tunnelid: 0xa010101 encap: VXLAN'] }
      ] }
  ],
  recap: () => ({ t: 'Symmetric IRB in place', pts: ['<b>Anycast gateway</b>: same IP + MAC on every leaf (fabric forwarding anycast-gateway-mac).', 'VRF Tenant-A ↔ <b>L3VNI 50001</b> (vrf context vni + associate-vrf).', '<b>Type-2 MAC+IP</b> carries two VNIs, two RTs and the router MAC; <b>Type-5</b> carries prefixes in the L3VNI.', '“Symmetric”: ingress leaf bridges+routes, egress leaf routes+bridges, same VNI both ways.'] })
});

/* ---------------------------------------------------------------- Chapter 7 : Border & external */
CHAPTERS.push({
  id: 7, title: 'Border & WAN', sub: 'eBGP · default · Type-5',
  intro: () => ({ t: 'Chapter 7 — Reaching the outside world', b: 'The <b>Border Leaf</b> connects the tenant VRF to an external router over <b>eBGP</b>. It learns a <b>default route</b> from the WAN and re-advertises it into the fabric as an EVPN <b>Type-5</b> route, so every leaf can send external traffic across the L3VNI to the border.', btn: "Let's configure it" }),
  steps: [
    { dev: 'wan', mirror: [],
      coach: { t: 'The WAN router', b: 'A simple external router that originates a default route and one test address, <b>203.0.113.1</b>.' },
      cmds: d => [
        { c: 'feature bgp', m: 'config' },
        { c: 'interface Ethernet1/1', m: 'config-if', x: X('Link toward the Border Leaf.') },
        { c: 'no switchport' }, { c: `ip address ${EXT.wan}/31` }, { c: 'no shutdown' },
        { c: 'interface loopback0', m: 'config-if' },
        { c: 'ip address 203.0.113.1/32', x: X('A test destination “on the Internet”.') },
        { c: 'ip route 0.0.0.0/0 Null0', m: 'config', x: X('A static default so BGP has something to originate.') },
        { c: 'router bgp 65100', m: 'config-router', x: X('The WAN lives in its own AS (65100) → this will be <b>eBGP</b>.') },
        { c: 'address-family ipv4 unicast', m: 'config-router-af' },
        { c: 'network 0.0.0.0/0', x: X('Originate the default route.') },
        { c: 'network 203.0.113.1/32' },
        { c: 'exit', m: 'config-router' },
        { c: `neighbor ${EXT.border}`, m: 'config-router-neighbor', x: X('The border leaf’s VRF-facing address.') },
        { c: 'remote-as 65000', x: X('The fabric’s AS (65000) — different from ours → eBGP.') },
        { c: 'address-family ipv4 unicast', m: 'config-router-neighbor-af' }
      ] },
    { dev: 'border',
      coach: { t: 'Border leaf: VRF-aware eBGP', b: 'The external link and the BGP session live <b>inside VRF Tenant-A</b>. When the session comes up, watch both the eBGP exchange and the Type-5 that follows.' },
      cmds: d => [
        { c: 'interface Ethernet1/20', m: 'config-if', x: X('The port toward the WAN.') },
        { c: 'no switchport' },
        { c: 'vrf member Tenant-A', x: X('Put the external link in the tenant VRF.', 'Tenant traffic stays in its VRF end-to-end: host → leaf → L3VNI → border → WAN, never touching the global table.') },
        { c: `ip address ${EXT.border}/31` }, { c: 'no shutdown' },
        { c: 'router bgp 65000', m: 'config-router' },
        { c: 'vrf Tenant-A', m: 'config-router-vrf' },
        { c: 'address-family ipv4 unicast', m: 'config-router-vrf-af' },
        { c: 'exit', m: 'config-router-vrf' },
        { c: `neighbor ${EXT.wan}`, m: 'config-router-vrf-neighbor', x: X('eBGP peer in the tenant VRF.') },
        { c: 'remote-as 65100', x: X('The WAN’s AS.') },
        { c: 'address-family ipv4 unicast', m: 'config-router-vrf-neighbor-af', cam: { n: 'doorman', at: { dev: 'border' } }, x: X('Activate IPv4 unicast with the WAN.', 'EVPN routes imported into this VRF are advertised to the WAN automatically (the tenant subnets); WAN routes learned here are exported to EVPN thanks to <code>advertise l2vpn evpn</code>.'),
          ev: [
            E([['border', 'wan']], 'eBGP to the WAN', [
              P.tcpSyn('border', 'wan', 'ext'), P.tcpSynAck('wan', 'border', 'ext'), P.tcpAck('border', 'wan', 'ext'),
              P.bgpOpen('border', 'wan', 'ext', { key: true, keyAs: true }), P.bgpOpen('wan', 'border', 'ext'),
              P.bgpKeepalive('wan', 'border', 'ext'), P.bgpKeepalive('border', 'wan', 'ext'),
              P.bgpUpdateV4('wan', 'border', ['0.0.0.0/0', '203.0.113.1/32'], EXT.wan, '65100')],
              'A plain <b>IPv4-unicast eBGP</b> session: <b>My AS 65000 ≠ 65100</b>, TTL 1, directly connected /31. The WAN’s UPDATE carries the <b>default route</b> and 203.0.113.1/32 with <b>AS_PATH 65100</b>.'),
            E([['border', 'spine1'], ['spine1', 'leaf1']], 'EVPN Type-5 default route', [
              P.bgpUpdateEvpn('border', 'spine1', 5, { origin: 'border', prefix: '0.0.0.0', plen: 0, key: true }),
              P.bgpUpdateEvpn('border', 'spine1', 5, { origin: 'border', prefix: '203.0.113.1', plen: 32 }),
              P.bgpUpdateEvpn('spine1', 'leaf1', 5, { origin: 'border', reflected: true, prefix: '0.0.0.0', plen: 0 })],
              'The border turned the WAN routes into <b>Type-5</b> routes: <b>0.0.0.0/0</b> and <b>203.0.113.1/32</b>, RD <b>10.0.0.13:3</b>, label <b>50001</b>, <b>Router’s MAC</b> of the border. The 3rd packet is Spine-1 reflecting the default to Leaf-1, next hop still <b>10.1.1.3</b>.', { pl: ['border → RR', 'RR → Leaf-1'] })
          ] }
      ] },
    { dev: 'leaf1', exec: true,
      coach: { t: 'Does Leaf-1 know the way out?', b: 'One default route, pointing at the Border Leaf’s VTEP, in the L3VNI.' },
      cmds: d => [
        { c: 'show bgp l2vpn evpn route-type 5', x: X('IP-prefix routes.'),
          out: ['Route Distinguisher: 10.0.0.13:3    (L3VNI 50001)', 'BGP routing table entry for [5]:[0]:[0]:[0]:[0.0.0.0]/224, version 14', '    Path type: internal, path is valid, is best path', '      10.1.1.3 (metric 3) from 10.0.0.1 (10.0.0.1)', '        Received label 50001', '        Extcommunity: RT:65000:50001 ENCAP:8 Router MAC:003a.7d0d.0000', '        Originator: 10.0.0.13 Cluster list: 10.0.0.1'] },
        { c: 'show ip route vrf Tenant-A', x: X('Tenant routing table.', 'Default and 203.0.113.1/32 via <b>10.1.1.3</b> (the border) with segid 50001.'),
          out: ['IP Route Table for VRF "Tenant-A"', '0.0.0.0/0, ubest/mbest: 1/0', '    *via 10.1.1.3%default, [200/0], 00:00:20, bgp-65000, internal, tag 65100 (evpn) segid: 50001 tunnelid: 0xa010103 encap: VXLAN', '10.1.10.0/24, ubest/mbest: 1/0, attached', '    *via 10.1.10.1, Vlan10, [0/0], 00:09:02, direct', '203.0.113.1/32, ubest/mbest: 1/0', '    *via 10.1.1.3%default, [200/0], 00:00:20, bgp-65000, internal, tag 65100 (evpn) segid: 50001 tunnelid: 0xa010103 encap: VXLAN'] }
      ] }
  ],
  recap: () => ({ t: 'The fabric has an exit', pts: ['Border leaf: external link + eBGP <b>inside the tenant VRF</b>.', 'WAN routes → <b>Type-5</b> routes (label = L3VNI, router MAC attached).', 'Leaves reach external networks through the border’s VTEP over the L3VNI.'] })
});

/* ---------------------------------------------------------------- Chapter 8 : End-to-end */
CHAPTERS.push({
  id: 8, title: 'End-to-end path', sub: 'Host → WAN in the L3VNI',
  intro: () => ({ t: 'Chapter 8 — Follow one packet', b: 'Everything is in place. Host-A pings <b>203.0.113.1</b> on the “Internet”. We follow the echo request and the reply hop by hop — host → Leaf-1 → <b>VXLAN (L3VNI 50001)</b> → Border → WAN — and see what changes at each hop.', btn: "Let's trace it" }),
  steps: [
    { dev: 'host', mirror: [],
      coach: { t: 'One ping, three hops', b: 'Watch the three pulses on the topology — host link, VXLAN tunnel, WAN link.' },
      cmds: d => [
        { c: 'ping -c 1 203.0.113.1', cam: { n: 'stampkeeper', at: { dev: 'leaf1' } },
          x: X('Ping an external address.', 'Host-A sends it to its default gateway (the anycast MAC). Everything after that is the fabric’s job.'),
          out: ['PING 203.0.113.1 (203.0.113.1) 56(84) bytes of data.', '64 bytes from 203.0.113.1: icmp_seq=1 ttl=61 time=1.9 ms'],
          ev: [
            E([['host', 'leaf1'], ['leaf1', 'spine1'], ['border', 'wan']], 'Echo request: 3 hops', [
              P.ping('host', 'leaf1', { sip: DEV.host.ip, dip: '203.0.113.1', smac: DEV.host.mac, dmac: P.GWM, ttl: 64, ethNote: 'Destination MAC = the ANYCAST gateway MAC: Host-A is talking to “its router”, which is Leaf-1.' }),
              P.vxlanRouted('leaf1', 'spine1', 'leaf1', 'border', { sip: DEV.host.ip, dip: '203.0.113.1', ttl: 63, key: true }),
              P.ping('border', 'wan', { sip: DEV.host.ip, dip: '203.0.113.1', smac: '00:3a:7d:0d:1f:01', dmac: '00:3a:7d:1f:0d:01', ttl: 62, ttlNote: 'Second routing hop: the border leaf decrements again before the WAN.' })],
              'Three captures of the <i>same</i> ping. ① Host → Leaf-1: dst MAC is the <b>anycast gateway</b>, TTL 64. ② <b>Leaf-1 → Border inside VXLAN</b> — the highlighted packet: <b>VNI 50001 (L3VNI)</b>, outer 10.1.1.1 → 10.1.1.3, and the <b>inner MACs are the two router MACs</b>; inner TTL is already <b>63</b>. ③ Border → WAN: plain routed IP, TTL <b>62</b>, no VXLAN.', { pl: ['① host → GW', '② VXLAN · L3VNI 50001', '③ plain routed'] }),
            E([['wan', 'border'], ['border', 'spine1'], ['leaf1', 'host']], 'Echo reply: the symmetric return', [
              P.ping('wan', 'border', { sip: '203.0.113.1', dip: DEV.host.ip, smac: '00:3a:7d:1f:0d:01', dmac: '00:3a:7d:0d:1f:01', ttl: 255, reply: true }),
              P.vxlanRouted('border', 'spine1', 'border', 'leaf1', { sip: '203.0.113.1', dip: DEV.host.ip, ttl: 254, reply: true, key: true }),
              P.ping('leaf1', 'host', { sip: '203.0.113.1', dip: DEV.host.ip, smac: P.GWM, dmac: DEV.host.mac, ttl: 253, reply: true })],
              'The return path uses the <b>same L3VNI 50001</b> — that is what “<b>symmetric</b>” means. Inner MACs flip (border router MAC → Leaf-1 router MAC). TTL ends at <b>253</b>: the reply was routed twice, just like the request.', { pl: ['① routed', '② VXLAN · L3VNI 50001', '③ to host'] })
          ] }
      ] },
    { dev: 'leaf1', exec: true,
      coach: { t: 'Verify the forwarding state', b: 'The peer list now carries the <b>Router MAC</b>, and the host’s IP is learned locally.' },
      cmds: d => [
        { c: 'show nve peers', x: X('VTEP peers.', 'The <b>Router-Mac</b> column is filled in once an L3VNI exists — it is what the remote leaf uses as the inner destination MAC.'),
          out: ['Interface Peer-IP          State LearnType Uptime   Router-Mac', '--------- ---------------  ----- --------- -------- -----------------', 'nve1      10.1.1.2         Up    CP        00:12:42 003a.7d0c.0000', 'nve1      10.1.1.3         Up    CP        00:12:42 003a.7d0d.0000'] },
        { c: 'show l2route evpn mac-ip all', x: X('MAC+IP bindings in the L2RIB.', '<b>HMM</b> = host-mobility-manager owns the binding; Next-Hop Local = Host-A attached here (via the ES).'),
          out: ['Topology    Mac Address    Prod   Host IP          Next-Hops', '----------- -------------- ------ ---------------- ---------------', '10          0050.56aa.1010 HMM    10.1.10.10       Local'] }
      ] }
  ],
  recap: () => ({ t: 'Packet walk complete', pts: ['Bridging inside a VNI uses the <b>L2VNI</b>; routing between subnets / to outside uses the <b>L3VNI</b>.', 'Inner MACs in the L3VNI are <b>router MACs</b> (from the EVPN extended community), not host MACs.', 'Symmetric IRB: same L3VNI in both directions; TTL is decremented at ingress AND egress leaf.', 'Next: what multihoming does under failure, ARP suppression, MAC mobility, and a troubleshooting lab.'] })
});

/* ---------------------------------------------------------------- Chapter 9 : DF, aliasing & failures */
CHAPTERS.push({
  id: 9, title: 'DF, aliasing & failures', sub: 'Type-1 · mass withdrawal',
  intro: () => ({ t: 'Chapter 9 — What multihoming does for you', b: 'Chapter 4 built the Ethernet Segment. Now we see it <b>work</b>: who is the <b>Designated Forwarder</b>, how a remote leaf load-balances to <b>both</b> Leaf-1 and Leaf-2 (<b>aliasing</b>), and what happens when Leaf-1 loses its uplinks — one <b>mass withdrawal</b> instead of thousands of MAC withdrawals.', btn: "Let's look" }),
  steps: [
    { dev: 'leaf1', exec: true,
      coach: { t: 'Who is the Designated Forwarder?', b: 'Both leaves are attached to Host-A. Only <b>one</b> may forward BUM traffic into the segment — otherwise the host gets duplicates.' },
      cmds: d => [
        { c: 'show nve ethernet-segment', x: X('ES state and DF.', 'VLAN 10 mod 2 = 0 → the first leaf in the ordered list (lowest VTEP IP, <b>10.1.1.1</b>) is the DF. Leaf-2 is the non-DF for this VLAN: it still forwards <i>unicast</i> to the host, it just drops BUM coming from the fabric.'),
          out: ['ESI: 0300.0000.0000.1000.000a', '   Parent interface: port-channel10', '  ES State: Up', '  Active Vlans: 10', '   DF Vlans: 10', '  Number of ES members: 2', '  My ordinal: 0', '  DF List: 10.1.1.1 10.1.1.2'] }
      ] },
    { dev: 'border', exec: true,
      coach: { t: 'Aliasing: one MAC, two next hops', b: 'Host-A’s MAC was only learned (and advertised) by Leaf-1. Yet the <b>Border</b> can send to <b>both</b> leaves. How?' },
      cmds: d => [
        { c: 'show bgp l2vpn evpn route-type 1', x: X('Ethernet AD routes.', 'Leaf-2 advertised a <b>per-EVI Type-1</b> for the same ESI. “Anyone with a MAC behind this ESI can also be reached through me” — that is aliasing.'),
          out: ['Route Distinguisher: 10.0.0.11:3', 'BGP routing table entry for [1]:[0300.0000.0000.1000.000a]:[4294967295]/152', '      10.1.1.1 (metric 3) from 10.0.0.1 (10.0.0.1)', '', 'Route Distinguisher: 10.0.0.12:32777', 'BGP routing table entry for [1]:[0300.0000.0000.1000.000a]:[0]/152', '      10.1.1.2 (metric 3) from 10.0.0.1 (10.0.0.1)', '        Received label 10010', '        Extcommunity: RT:65000:10010 ENCAP:8'],
          ev: E([['leaf2', 'spine1'], ['spine1', 'border']], 'Type-1 per-EVI: the aliasing route', [
            P.bgpUpdateEvpn('leaf2', 'spine1', '1EVI', { origin: 'leaf2', key: true }),
            P.bgpUpdateEvpn('spine1', 'border', '1EVI', { origin: 'leaf2', reflected: true })],
            'Leaf-2 never learned Host-A’s MAC from a frame, but it announces <b>“I am attached to this ESI for VNI 10010”</b>. The Border now holds <b>two next hops</b> (10.1.1.1 and 10.1.1.2) for any MAC on the ESI.') },
        { c: 'show l2route evpn mac all', x: X('The L2RIB on the border.', '<b>Two next hops</b> for one MAC: the Border hashes flows across Leaf-1 <i>and</i> Leaf-2. Without aliasing every flow would use only Leaf-1, the leaf that happened to learn the MAC.'),
          out: ['Topology    Mac Address    Prod   Flags         Seq No     Next-Hops', '----------- -------------- ------ ------------- ---------- ---------------', '10          0050.56aa.1010 BGP    SplRcv        0          10.1.1.1', '                                                             10.1.1.2'] }
      ] },
    { dev: 'leaf1', mirror: [],
      coach: { t: 'Pull the plug on Leaf-1', b: 'Leaf-1 loses <b>both</b> uplinks. With <code>core-tracking</code> it shuts its host port, and tells the fabric in <b>one</b> message.' },
      cmds: d => {
        const o = [];
        UPL[d].forEach((u, i) => {
          o.push({ c: `interface ${u.ifc}`, m: 'config-if' });
          const c = { c: 'shutdown', cam: { n: 'scissors', at: { dev: 'leaf1' } }, x: i === 0 ? X('Admin-down the uplink.', 'After the first, Leaf-1 still has one path. Core-tracking only acts when <b>all</b> tracked uplinks are down.') : X('Second (last) uplink down — Leaf-1 is now isolated from the fabric.', 'Core-tracking sees zero uplinks → it shuts port-channel10 so Host-A fails over to Leaf-2 at once.') };
          if (i === UPL[d].length - 1) c.cam = [c.cam, { n: 'referee', at: { dev: 'leaf2' } }];
          if (i === UPL[d].length - 1) c.ev = E([['leaf1', 'spine1']], 'Mass withdrawal: one Type-1', [P.bgpWithdraw('leaf1', 'spine1', '1ES', { origin: 'leaf1', key: true })],
            'The key packet: <b>MP_UNREACH_NLRI</b> carrying the <b>Type-1 per-ES</b> route (Ethernet Tag <b>0xffffffff</b>). One withdrawal makes every remote leaf drop Leaf-1 as a next hop for <b>every MAC behind this ESI</b> — instantly, no per-MAC churn. (Shown as it left just before the last link died.)');
          o.push(c);
        });
        return o;
      } },
    { dev: 'leaf2', exec: true,
      coach: { t: 'Leaf-2 takes over', b: 'Same ESI, now one member. Host-A never noticed anything except one lost link.' },
      cmds: d => [
        { c: 'show nve ethernet-segment', x: X('ES state after the failure.', '<b>Number of ES members: 1</b> and Leaf-2 is now the only DF. The host’s LACP bundle simply lost a member.'),
          out: ['ESI: 0300.0000.0000.1000.000a', '   Parent interface: port-channel10', '  ES State: Up', '   DF Vlans: 10', '  Number of ES members: 1', '  My ordinal: 0', '  DF List: 10.1.1.2'] }
      ] },
    { dev: 'leaf1', mirror: [],
      coach: { t: 'Restore Leaf-1', b: 'Bring the uplinks back. The ES comes back, Type-1 is re-advertised, DF is re-elected.' },
      cmds: d => {
        const o = [];
        UPL[d].forEach((u, i) => {
          o.push({ c: `interface ${u.ifc}`, m: 'config-if' });
          const c = { c: 'no shutdown', x: i === 0 ? X('Re-enable the uplink.') : X('Last uplink up → core-tracking releases port-channel10.') };
          if (i === UPL[d].length - 1) c.ev = E([['leaf1', 'spine1']], 'Type-1 per-ES returns', [P.bgpUpdateEvpn('leaf1', 'spine1', '1ES', { origin: 'leaf1', key: true })],
            'The same Type-1 per-ES route is advertised again. Remote leaves add Leaf-1 back as a next hop. NX-OS also holds Leaf-1 out of the DF election for a short <b>hold timer</b> so it doesn’t grab BUM before it has the full table.');
          o.push(c);
        });
        return o;
      } }
  ],
  recap: () => ({ t: 'Multihoming under stress', pts: ['<b>DF</b>: one leaf per VLAN forwards BUM into the segment (modulo of the VLAN).', '<b>Aliasing</b> (Type-1 per-EVI): remote leaves load-balance to every leaf on the ESI, even one that never learned the MAC.', '<b>Mass withdrawal</b> (Type-1 per-ES): one MP_UNREACH removes a failed leaf for all MACs at once.', '<b>core-tracking</b> shuts the host port when the leaf is cut off, so the host fails over instead of black-holing.'] })
});

/* ---------------------------------------------------------------- Chapter 10 : ARP suppression & MAC mobility */
CHAPTERS.push({
  id: 10, title: 'ARP suppression & mobility', sub: 'Type-2 seq · MP_UNREACH',
  intro: () => ({ t: 'Chapter 10 — Fewer broadcasts, moving hosts', b: 'Two features that make a fabric behave. <b>ARP suppression</b>: a leaf answers ARP itself from what BGP told it, so ARP never floods over VXLAN. <b>MAC mobility</b>: when a VM moves, the new leaf advertises the same MAC with a <b>higher sequence number</b> and the old leaf withdraws it. We use a VM at <b>10.1.10.50</b>.', btn: "Let's configure it" }),
  steps: [
    { dev: 'border', mirror: [],
      coach: { t: 'A VM appears behind the Border', b: 'A hypervisor on <b>Border-Leaf Eth1/11</b> boots VM <b>10.1.10.50</b>. Its first frame teaches the fabric where it lives.' },
      cmds: d => [
        { c: 'interface Ethernet1/11', m: 'config-if', x: X('Server port on the border leaf.') },
        { c: 'switchport' }, { c: 'switchport mode access' },
        { c: 'switchport access vlan 10', x: X('The VM’s traffic lands in VLAN 10 (VNI 10010).') },
        { c: 'no shutdown', x: X('Port up — the VM sends a gratuitous ARP, the border learns its MAC and IP.'),
          ev: E([['border', 'spine1'], ['spine1', 'leaf1']], 'Type-2 for the VM (no sequence yet)', [
            P.bgpUpdateEvpn('border', 'spine1', 'VM', { origin: 'border', key: true }),
            P.bgpUpdateEvpn('spine1', 'leaf1', 'VM', { origin: 'border', reflected: true })],
            'MAC <b>00:50:56:aa:10:50</b> + IP <b>10.1.10.50</b>, next hop <b>10.1.1.3</b> (the border). Expand the extended communities: <b>no MAC Mobility attribute</b> — this MAC has never moved (sequence 0). The ESI is all-zero: single-homed.') }
      ] },
    { dev: 'leaf1', mirror: ['leaf2', 'border'],
      coach: { t: 'Turn on ARP suppression', b: 'Each leaf will answer ARP for known hosts itself — local <b>and</b> remote.' },
      cmds: d => [
        { c: 'hardware access-list tcam region arp-ether 256 double-wide', m: 'config', x: X('Reserves TCAM for ARP snooping.', 'ARP suppression punts ARP to the CPU via a TCAM entry. The region is double-wide, so it needs two slices.', 'Takes effect after a reload on most platforms; check your platform guide.') },
        { c: 'interface nve1', m: 'config-if-nve' },
        { c: 'member vni 10010', m: 'config-if-nve-vni' },
        { c: 'suppress-arp', x: X('Answer ARP for VNI 10010 locally.', 'The leaf snoops ARP to learn local IP↔MAC bindings, and uses Type-2 routes for remote ones. It replies with the host’s <b>own</b> MAC (this is not proxy-ARP with the SVI MAC).', 'Unknown target? The request still floods (BUM) as a fallback — that is how silent hosts get discovered.') }
      ] },
    { dev: 'host', mirror: [],
      coach: { t: 'Host-A asks for the VM', b: 'Host-A ARPs for 10.1.10.50, which lives <b>across the fabric</b>. Count the VXLAN packets.' },
      cmds: d => [
        { c: 'arping -I bond0 -c 1 10.1.10.50', cam: { n: 'concierge', at: { dev: 'leaf1' } }, x: X('Normal ARP request.', 'Without suppression this broadcast is flooded to every VTEP in VNI 10010.'),
          out: ['ARPING 10.1.10.50 from 10.1.10.10 bond0', 'Unicast reply from 10.1.10.50 [00:50:56:AA:10:50]  0.612ms', 'Sent 1 probes (1 broadcast(s))', 'Received 1 response(s)'],
          ev: E([['host', 'leaf1']], 'ARP answered at the first hop', [P.arpVM(['host', 'leaf1'], 'req', true), P.arpVM(['leaf1', 'host'], 'rep')],
            'Request goes in, reply comes out of <b>Leaf-1</b> — and <b>no VXLAN packet</b> leaves the leaf (compare Chapter 5, where a broadcast became one copy per VTEP). The reply carries the VM’s <b>real MAC</b>.') }
      ] },
    { dev: 'leaf1', exec: true,
      coach: { t: 'Where did Leaf-1 get the answer?', b: 'From a cache fed by BGP, not from the VM.' },
      cmds: d => [
        { c: 'show ip arp suppression-cache detail', x: X('The suppression cache.', 'Flag <b>R</b> = remote adjacency, learned from the Type-2 route; the <b>Remote VTEP</b> column shows where it lives. Local hosts carry <b>L</b>.'),
          out: ['Flags: L - Local, R - Remote, + - Synced', 'Ip Address      Age        Mac Address     Vlan Physical-ifindex    Flags    Remote Vtep Addrs', '10.1.10.50      00:00:40   0050.56aa.1050  10   (null)              R        10.1.1.3', '10.1.10.10      00:03:12   0050.56aa.1010  10   port-channel10      L'] }
      ] },
    { dev: 'leaf1', mirror: [],
      coach: { t: 'The VM moves to Leaf-1', b: 'vMotion: the VM is now behind <b>Leaf-1 Eth1/11</b>. Same MAC, same IP, new location. Watch the sequence number.' },
      cmds: d => [
        { c: 'interface Ethernet1/11', m: 'config-if' },
        { c: 'switchport' }, { c: 'switchport mode access' },
        { c: 'switchport access vlan 10' },
        { c: 'no shutdown', cam: { n: 'ticket', at: { dev: 'leaf1' } }, x: X('The hypervisor sends a RARP/GARP for the VM on the new port.', 'That first frame is what triggers the move. Without it the fabric keeps sending to the old leaf until the VM sends something.'),
          ev: [
            E([['leaf1', 'spine1'], ['spine1', 'border']], '① New owner: same MAC, sequence 1', [
              P.bgpUpdateEvpn('leaf1', 'spine1', 'VM', { origin: 'leaf1', seq: 1, key: true }),
              P.bgpUpdateEvpn('spine1', 'border', 'VM', { origin: 'leaf1', seq: 1, reflected: true })],
              'Leaf-1 saw a MAC it already knew as <b>remote</b>, so it advertises it with <b>MAC Mobility Sequence = 1</b>. Every VTEP prefers the highest sequence: <b>Leaf-1 beats the Border</b>.'),
            E([['border', 'spine1']], '② Old owner withdraws', [P.bgpWithdraw('border', 'spine1', 'VM', { origin: 'border', key: true })],
              'The Border receives the sequence-1 route, concludes the VM left and sends <b>MP_UNREACH_NLRI</b> for the old route. Filter <code>bgp.update.path_attribute.type_code == 15</code> shows only withdrawals.')
          ] }
      ] },
    { dev: 'leaf2', exec: true,
      coach: { t: 'Who owns the MAC now?', b: 'Leaf-2 sits in the middle and sees both histories.' },
      cmds: d => [
        { c: 'show l2route evpn mac all', x: X('L2RIB with sequence numbers.', '<b>Seq No 1</b> and next hop <b>10.1.1.1</b>. The previous location (10.1.1.3) is gone.', 'A host that moves 5+ times in 180 s is treated as a duplicate/loop and frozen. Check <code>l2rib dup-host-mac-detection</code>.'),
          out: ['Topology    Mac Address    Prod   Flags         Seq No     Next-Hops', '----------- -------------- ------ ------------- ---------- ---------------', '10          0050.56aa.1010 Local  L,            0          Po10', '10          0050.56aa.1050 BGP    --            1          10.1.1.1'] },
        { c: 'show bgp l2vpn evpn 0050.56aa.1050', x: X('One MAC in the BGP table.', 'Look at the Extcommunity line: <b>MAC Mobility Sequence:00:1</b>.'),
          out: ['BGP routing table entry for [2]:[0]:[0]:[48]:[0050.56aa.1050]:[32]:[10.1.10.50]/272, version 21', '    Path type: internal, path is valid, is best path', '      10.1.1.1 (metric 3) from 10.0.0.1 (10.0.0.1)', '        Received label 10010 50001', '        Extcommunity: RT:65000:10010 RT:65000:50001 ENCAP:8 MAC Mobility Sequence:00:1 Router MAC:003a.7d0b.0000'] }
      ] }
  ],
  recap: () => ({ t: 'Quieter, smarter fabric', pts: ['<b>suppress-arp</b>: leaves answer ARP from the Type-2 MAC+IP bindings; the broadcast never leaves the leaf.', 'The answer carries the host’s <b>real</b> MAC.', '<b>MAC mobility</b>: same MAC, new leaf, <b>sequence + 1</b>; the highest sequence wins.', 'The old leaf withdraws with <b>MP_UNREACH_NLRI</b>. Dup-detection freezes a MAC that moves too often (commonly 5 moves / 180 s).'] })
});

/* ---------------------------------------------------------------- Chapter 11 : Troubleshooting */
CHAPTERS.push({
  id: 11, title: 'Troubleshooting lab', sub: '3 faults · bottom-up',
  intro: () => ({ t: 'Chapter 11 — Something is broken', b: 'A colleague “tidied up” the fabric. Three separate faults, each found <b>bottom-up</b>: <b>underlay → BGP session → route-targets/EVI → NVE</b>. For each one you read the symptom, predict the cause, then fix it.', btn: "Let's debug" }),
  steps: [
    { dev: 'leaf1', exec: true, glitch: { id: 'void', kind: 'void', target: { dev: 'border' } },
      coach: { t: 'Case 1 — Sessions up, no tunnel to the Border', b: 'BGP to both spines is Established, but Leaf-1 has no VTEP peer for the Border.' },
      cmds: d => [
        { c: 'show nve peers', x: X('VTEP peers.', 'Leaf-2 (10.1.1.2) is there; the Border (10.1.1.3) is missing.'),
          out: ['Interface Peer-IP          State LearnType Uptime   Router-Mac', '--------- ---------------  ----- --------- -------- -----------------', 'nve1      10.1.1.2         Up    CP        02:11:09 003a.7d0c.0000'] },
        { c: 'show bgp l2vpn evpn route-type 3', cam: { n: 'inspector', at: { dev: 'leaf1' } }, x: X('Look for the Border’s Type-3.', 'The route <b>is</b> in the table, but its <b>Extcommunity line is empty</b>: no RT, no ENCAP:8. Nobody can import a route that carries no route-target.', 'Extended communities are not sent by default: <code>send-community extended</code> is per neighbor.'),
          out: ['Route Distinguisher: 10.0.0.13:32777', 'BGP routing table entry for [3]:[0]:[32]:[10.1.1.3]/88, version 9', '    Path type: internal, path is valid, is best path', '      10.1.1.3 (metric 3) from 10.0.0.1 (10.0.0.1)', '        Extcommunity:', '        Originator: 10.0.0.13 Cluster list: 10.0.0.1'] }
      ] },
    { dev: 'border', mirror: [], clear: 'void',
      coach: { t: 'Fix 1 — send the extended communities', b: 'The Border lost <code>send-community extended</code> toward both spines.' },
      cmds: d => {
        const o = [{ c: 'router bgp 65000', m: 'config-router' }];
        SPN.forEach((s, i) => {
          o.push({ c: `neighbor ${DEV[s].lo0}`, m: 'config-router-neighbor' });
          o.push({ c: 'address-family l2vpn evpn', m: 'config-router-neighbor-af' });
          const c = { c: 'send-community extended', x: i === 0 ? X('Re-enable extended communities toward the spine.', 'This carries the RT, ENCAP:8 and Router MAC. After a refresh the route is complete again.') : null };
          if (i === 0) c.ev = E([['border', 'spine1'], ['spine1', 'leaf1']], 'Type-3 with its RT back', [
            P.bgpUpdateEvpn('border', 'spine1', 3, { origin: 'border', key: true }), P.bgpUpdateEvpn('spine1', 'leaf1', 3, { origin: 'border', reflected: true })],
            'Same route as before, but <b>EXTENDED_COMMUNITIES</b> now contains <b>RT 65000:10010</b> and <b>Encapsulation VXLAN</b>. Leaf-1 can import it and the VTEP peer appears.');
          o.push(c);
          o.push({ c: 'exit', m: 'config-router-neighbor' }); o.push({ c: 'exit', m: 'config-router' });
        });
        return o;
      } },
    { dev: 'leaf1', exec: true, glitch: { id: 'overflow', kind: 'overflow', target: { link: ['leaf1', 'spine2'] } },
      coach: { t: 'Case 2 — An OSPF neighbor is stuck', b: 'Leaf-1 reaches Spine-1 but the adjacency to <b>Spine-2</b> never gets past <b>EXSTART</b>.' },
      cmds: d => [
        { c: 'show ip ospf neighbors', x: X('Adjacencies.', 'Spine-2 stuck in <b>EXSTART</b>: Hellos work (so 2-Way is fine) but the DB Description exchange fails.'),
          out: [' OSPF Process ID UNDERLAY VRF default', ' Total number of neighbors: 2', ' Neighbor ID     Pri State            Up Time  Address         Interface', ' 10.0.0.1          1 FULL/ -          02:14:30 10.2.11.0       Eth1/1', ' 10.0.0.2          1 EXSTART/ -       00:00:41 10.2.12.0       Eth1/2'] },
        { c: 'ping 10.2.12.0 packet-size 8972 df-bit count 2', cam: { n: 'inspector', at: { dev: 'leaf1' } }, x: X('Jumbo DF ping to Spine-2.', 'This is the Chapter 1 test again. <b>100% loss</b> with DF set means a smaller MTU somewhere on this link. OSPF refuses to go FULL when the two ends advertise different MTUs in the DBD.'),
          out: ['PING 10.2.12.0 (10.2.12.0): 8972 data bytes', 'Request 0 timed out', 'Request 1 timed out', '', '--- 10.2.12.0 ping statistics ---', '2 packets transmitted, 0 packets received, 100.00% packet loss'] }
      ] },
    { dev: 'spine2', mirror: [], clear: 'overflow',
      coach: { t: 'Fix 2 — the spine end was reset to 1500', b: 'Spine-2’s port toward Leaf-1 lost its jumbo MTU.' },
      cmds: d => [
        { c: 'interface Ethernet1/1', m: 'config-if', x: X('Spine-2’s port toward Leaf-1.') },
        { c: 'mtu 9216', x: X('Restore jumbo MTU.', 'Both ends must match: the DBD packet carries the interface MTU and OSPF compares them.'),
          ev: E([['leaf1', 'spine2']], 'OSPF completes the exchange', [P.ospf('leaf1', 'spine2', 'dbd', { key: true }), P.ospf('spine2', 'leaf1', 'dbd'), P.ospf('leaf1', 'spine2', 'lsu'), P.ospf('spine2', 'leaf1', 'ack')],
            'The <b>Interface MTU</b> in both DB Description packets is now <b>9216</b>, so the exchange continues to LS Update / LS Ack and the neighbor reaches <b>FULL</b>.') }
      ] },
    { dev: 'leaf1', exec: true, glitch: { id: 'static', kind: 'static', target: { dev: 'leaf1' } },
      coach: { t: 'Case 3 — The BGP route is there, the peer is not', b: 'Leaf-2’s Type-3 is in the BGP table, yet Leaf-1 shows no VTEP peer for 10.1.1.2.' },
      cmds: d => [
        { c: 'show bgp l2vpn evpn route-type 3', x: X('The route is present and carries RT 65000:10010.', 'BGP is fine. If a route is in the table but not used, suspect the <b>import</b> side.'),
          out: ['Route Distinguisher: 10.0.0.12:32777', 'BGP routing table entry for [3]:[0]:[32]:[10.1.1.2]/88, version 6', '    Path type: internal, path is valid, is best path', '      10.1.1.2 (metric 3) from 10.0.0.1 (10.0.0.1)', '        Extcommunity: RT:65000:10010 ENCAP:8'] },
        { c: 'show running-config | section evpn', cam: { n: 'inspector', at: { dev: 'leaf1' } }, x: X('The local EVPN instance.', 'Leaf-1 imports <b>65000:10011</b>, not 10010. The route’s RT matches nothing here, so it is silently ignored.', 'RT mismatches never log an error: the symptom is only “the route is in BGP but not in the L2RIB”.'),
          out: ['evpn', '  vni 10010 l2', '    rd auto', '    route-target import 65000:10011', '    route-target export auto'] }
      ] },
    { dev: 'leaf1', mirror: [], clear: 'static',
      coach: { t: 'Fix 3 — import the right route-target', b: 'Replace the typo with <code>auto</code>.' },
      cmds: d => [
        { c: 'evpn', m: 'config-evpn' },
        { c: 'vni 10010 l2', m: 'config-evpn-evi' },
        { c: 'no route-target import 65000:10011', x: X('Remove the wrong RT.') },
        { c: 'route-target import auto', x: X('Import 65000:10010 again.', 'Leaf-1 re-evaluates the routes it already holds. No new BGP packets are needed.') }
      ] },
    { dev: 'leaf1', exec: true,
      coach: { t: 'Verify the whole fabric', b: 'All three faults are gone. Same checks, bottom-up.' },
      cmds: d => [
        { c: 'show ip ospf neighbors', x: X('Underlay.', 'Both <b>FULL</b>.'),
          out: [' Total number of neighbors: 2', ' 10.0.0.1          1 FULL/ -          02:16:10 10.2.11.0       Eth1/1', ' 10.0.0.2          1 FULL/ -          00:01:50 10.2.12.0       Eth1/2'] },
        { c: 'show bgp l2vpn evpn summary', x: X('Control plane.', 'Both sessions Established.'),
          out: ['Neighbor        V    AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd', '10.0.0.1        4 65000     412     399       31    0    0 02:16:12 9', '10.0.0.2        4 65000     405     397       31    0    0 02:16:10 9'] },
        { c: 'show nve peers', x: X('Data plane.', 'Both VTEPs back, learned via <b>CP</b>.'),
          out: ['Interface Peer-IP          State LearnType Uptime   Router-Mac', '--------- ---------------  ----- --------- -------- -----------------', 'nve1      10.1.1.2         Up    CP        00:00:25 003a.7d0c.0000', 'nve1      10.1.1.3         Up    CP        00:01:30 003a.7d0d.0000'] }
      ] }
  ],
  recap: () => ({ t: 'Fabric repaired', pts: ['Go <b>bottom-up</b>: underlay (OSPF, MTU) → BGP session → route-targets/EVI → NVE peers.', '<b>Route in BGP but not used</b> → check import RTs. <b>Route with no Extcommunity</b> → send-community extended.', '<b>OSPF stuck in EXSTART</b> → MTU mismatch. Prove it with a jumbo DF ping.', 'Wireshark finds the control-plane faults; <code>show</code> commands finish the job.'] })
});

const COMING = [];
