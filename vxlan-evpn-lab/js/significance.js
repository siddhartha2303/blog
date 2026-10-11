/* One-line "Command significance" in plain, precise wording + a real Wireshark display-filter engine.
   SIG: first matching regex wins. [regex, significance, gotcha?] */
const SIG = [
  // features
  [/^feature ospf/, 'Enables the OSPF process (NX-OS features are off by default).'],
  [/^feature lacp/, 'Enables LACP (needed for channel-group … mode active).'],
  [/^feature bgp/, 'Enables the BGP process.'],
  [/^feature pim/, 'Enables PIM — needed only for multicast BUM replication.'],
  [/^feature nv overlay/, 'Enables the NVE interface = the VTEP function.'],
  [/^feature vn-segment-vlan-based/, 'Allows VLAN → VNI mapping (vn-segment).'],
  [/^feature interface-vlan/, 'Enables SVIs (interface VlanX).'],
  [/^feature fabric forwarding/, 'Enables the distributed anycast gateway.'],
  [/^nv overlay evpn/, 'Turns on the BGP EVPN control plane — no flood-and-learn.'],
  // physical / loopbacks
  [/^no switchport/, 'Makes the port a routed L3 link — no STP, no VLANs in the underlay.', 'Nexus ports default to L2 — forget this and the /31 never comes up.'],
  [/^mtu 9216/, 'Jumbo MTU. VXLAN adds 50 bytes (14 Eth + 20 IP + 8 UDP + 8 VXLAN) → underlay needs ≥ 1550.', 'Must match on both ends of every link.'],
  [/^ip address \S+\/31/, '/31 point-to-point addressing (RFC 3021) — no wasted addresses.'],
  [/^ip address 10\.1\.10\.1\/24/, 'Gateway IP 10.1.10.1 — identical on every leaf.'],
  [/^ip address \S+\/32/, 'Loopback /32 — never goes down while any path exists.'],
  [/^interface loopback0/, 'Loopback0 = router-id + BGP peering source.'],
  [/^interface loopback1/, 'Loopback1 = VTEP IP: outer source of every VXLAN packet and EVPN next hop.'],
  [/^interface loopback254/, 'Anycast-RP loopback — the SAME IP on both spines.'],
  [/^no shutdown/, 'Enables the interface.'],
  [/^interface Ethernet1\/10/, 'Physical port toward Host-A.'],
  [/^interface Ethernet1\/20/, 'Border port toward the WAN router.'],
  [/^interface Ethernet/, 'Enters the fabric link (routed point-to-point).'],
  [/^switchport mode access/, 'Access port — untagged host traffic.'],
  [/^switchport$/, 'Makes the port Layer 2.'],
  [/^name /, 'Human-readable name — no effect on forwarding.'],
  [/^no ip redirects/, 'Disables ICMP redirects on the SVI (best practice for gateway / L3VNI SVIs).'],
  [/^network 203/, 'Originates the test prefix 203.0.113.1/32.'],
  [/^neighbor 192\.0\.2/, 'Defines the eBGP peer on the /31 toward the WAN.'],
  [/^neighbor /, 'Defines the BGP peer by its Loopback0 address.'],
  // OSPF
  [/^router ospf/, 'Starts OSPF instance UNDERLAY — reachability between all loopbacks.'],
  [/^router-id/, 'Pins the router-id to Loopback0 (stable; RD auto is built from it).'],
  [/^ip ospf network point-to-point/, 'No DR/BDR election, no Type-2 LSA → faster adjacency.'],
  [/^ip router ospf/, 'Enables OSPF area 0 on this interface — Hellos start at once.'],
  // PIM
  [/^ip pim sparse-mode/, 'Enables PIM-SM here — neighbors found by Hellos to 224.0.0.13.'],
  [/^ip pim rp-address/, 'Static RP 10.254.254.1 for the BUM groups 239.1.1.0/24.'],
  [/^ip pim anycast-rp/, 'Anycast-RP member: RPs sync (S,G) state over their unique Loopback0 (RFC 4610).'],
  // VLAN / VNI / NVE
  [/^vlan 3500/, 'Transit VLAN that carries the L3VNI.'],
  [/^vlan \d+/, 'Creates the VLAN — locally significant only.'],
  [/^vn-segment 50001/, 'Maps VLAN 3500 → L3VNI 50001.'],
  [/^vn-segment/, 'Maps VLAN → VNI. The VNI is the fabric-wide 24-bit segment ID.', 'Every VTEP in the segment must use the same VNI.'],
  [/^interface nve1/, 'Creates the NVE — the single logical VTEP interface.'],
  [/^host-reachability protocol bgp/, 'Control-plane learning: MAC/IP reachability comes from BGP EVPN.'],
  [/^source-interface loopback1/, 'VTEP source = Loopback1 (outer source IP of every VXLAN packet).'],
  [/^member vni \d+ associate-vrf/, 'Binds the L3VNI to the NVE — routed unicast only, no BUM.'],
  [/^member vni/, 'Attaches the L2VNI to the VTEP.'],
  [/^ingress-replication protocol bgp/, 'BUM = head-end replication. Remote-VTEP list comes from EVPN Type-3 routes.'],
  [/^mcast-group/, 'BUM = ONE packet to the multicast group; the underlay (PIM) replicates it.', 'Same group on every VTEP; NVE loopback must run PIM.'],
  // BGP
  [/^router bgp 65100/, 'WAN router in its own AS 65100 → eBGP to the border.'],
  [/^router bgp/, 'Starts BGP AS 65000 — one AS for the whole fabric (iBGP).'],
  [/^address-family l2vpn evpn/, 'Activates the L2VPN EVPN address-family (AFI 25 / SAFI 70).'],
  [/^address-family ipv4 unicast/, 'Activates the IPv4 unicast address-family.'],
  [/^retain route-target all/, 'Keeps EVPN routes although the spine imports no RT — otherwise they are dropped.'],
  [/^remote-as 65100/, 'Different AS → eBGP session.'],
  [/^remote-as 65000/, 'Same AS → iBGP session.'],
  [/^update-source loopback0/, 'Sources BGP from Loopback0 — the session survives a link failure.'],
  [/^send-community extended/, 'Transmits BGP Extended Communities: Route-Targets, Encapsulation = 8 (VXLAN), Router MAC.', 'Without it routes arrive but are never imported.'],
  [/^route-reflector-client/, 'Spine reflects this leaf’s routes to the other leaves (adds ORIGINATOR_ID / CLUSTER_LIST).', 'Without it Leaf-1 routes never reach Leaf-2 (iBGP split-horizon).'],
  [/^maximum-paths ibgp/, 'ECMP over several EVPN next hops — needed for aliasing to both ES leaves.'],
  [/^maximum-paths/, 'ECMP — use both spines instead of one.'],
  [/^evpn$/, 'Enters the EVPN instance section.'],
  [/^vni \d+ l2/, 'Declares the L2VNI as an EVPN instance (EVI).'],
  [/^rd auto/, 'Auto Route-Distinguisher (router-id:VLAN+32767, or router-id:3 for a VRF) — makes routes unique.'],
  [/^route-target import auto/, 'Imports RT 65000:VNI (auto = ASN:VNI).'],
  [/^route-target export auto/, 'Exports RT 65000:VNI → this triggers the Type-3 IMET route.'],
  [/^route-target both auto evpn/, 'L3 RT 65000:50001 for EVPN routes → Type-2 MAC+IP and Type-5 enter the VRF.'],
  [/^route-target both auto/, 'L3 RT 65000:50001 for the VRF’s IPv4 routes.'],
  // multihoming
  [/^evpn multihoming core-tracking/, 'Tracks the uplink: if all uplinks fail, ES ports go down so the host fails over.'],
  [/^evpn multihoming/, 'Enables EVPN ESI multihoming — all-active, no vPC peer-link.'],
  [/^system-mac/, 'ES system-MAC: builds the Type-3 ESI and is the LACP system-ID both leaves present.', 'Must be identical on both leaves.'],
  [/^df-election mode modulo/, 'DF election = VLAN mod N. Only the DF forwards BUM into the segment.'],
  [/^interface port-channel10/, 'Port-channel toward Host-A — becomes the Ethernet Segment.'],
  [/^ethernet-segment/, 'Marks the port-channel as an EVPN Ethernet Segment.'],
  [/^esi system-mac/, 'ESI = 03 | system-mac | 10 → 0300.0000.0000.1000.000a. Triggers Type-4 + Type-1 routes.'],
  [/^channel-group/, 'Adds the port to LACP bundle 10 (active).'],
  [/^switchport access vlan/, 'Host traffic lands in VLAN 10 (VNI 10010).'],
  // IRB
  [/^fabric forwarding anycast-gateway-mac/, 'ONE gateway MAC fabric-wide — every leaf answers ARP with it.'],
  [/^fabric forwarding mode anycast-gateway/, 'SVI uses the shared anycast MAC → first-hop gateway on every leaf.'],
  [/^vrf context/, 'Creates tenant VRF Tenant-A — an isolated routing table.'],
  [/^vni 50001$/, 'Binds VRF Tenant-A to L3VNI 50001 — the VNI for all routed traffic.'],
  [/^interface Vlan3500/, 'L3VNI SVI — routes between VTEPs, needs no IP.'],
  [/^interface Vlan10/, 'Gateway SVI for VLAN 10.'],
  [/^ip forward/, 'Enables IP forwarding on the SVI without an IP address.'],
  [/^vrf member/, 'Places the interface in VRF Tenant-A.'],
  [/^route-map RM-CONNECTED/, 'Permit-all policy for redistributing connected subnets.'],
  [/^vrf Tenant-A/, 'BGP section for VRF Tenant-A.'],
  [/^advertise l2vpn evpn/, 'Exports the VRF’s IPv4 routes into EVPN as Type-5 (and imports EVPN routes).'],
  [/^redistribute direct/, 'Injects 10.1.10.0/24 into BGP → advertised as a Type-5 route.'],
  [/^network 0\.0\.0\.0\/0/, 'Originates the default route toward the fabric.'],
  [/^ip route 0\.0\.0\.0\/0 Null0/, 'Static default so BGP has a route to originate.'],
  // host
  [/^ip link add bond0/, 'Creates an 802.3ad (LACP) bond with 1-second LACPDUs.'],
  [/^ip link set eth\d master bond0/, 'Adds the NIC to the bond.'],
  [/^ip link set bond0 up/, 'Starts LACP negotiation with both leaves.'],
  [/^ip addr add/, 'Host IP 10.1.10.10/24 in VLAN 10’s subnet.'],
  [/^arping -U/, 'Gratuitous ARP: a broadcast → MAC learning + BUM replication.'],
  [/^ip route add default/, 'Default gateway = anycast gateway 10.1.10.1.'],
  [/^ping -c 2 10\.1\.10\.1/, 'Forces ARP for the gateway → leaf learns the host IP → Type-2 MAC+IP.'],
  [/^ping -c 1 203/, 'Routed traffic: host → L3VNI 50001 → border → WAN.'],
  // chapters 9-11
  [/^shutdown/, 'Takes the interface down (admin).'],
  [/^hardware access-list tcam region arp-ether/, 'Carves TCAM so ARP can be snooped in hardware (double-wide).', 'Needs a reload on most platforms.'],
  [/^suppress-arp/, 'Leaf answers ARP locally from its learned MAC/IP bindings → no broadcast over VXLAN.'],
  [/^switchport access vlan 10/, 'Server port lands in VLAN 10 (VNI 10010).'],
  [/^arping -I bond0/, 'ARP request for the VM — watch who answers.'],
  [/^no route-target import/, 'Removes the wrong import RT.'],
  [/^show ip arp suppression-cache/, 'The ARP-suppression cache: IP → MAC, local or remote.'],
  [/^show bgp l2vpn evpn [0-9a-f]{4}\./, 'One MAC in the BGP table, with its MAC Mobility sequence.'],
  [/^show interface .*mtu/i, 'Interface MTU.'],
  // verification
  [/^ping .*df-bit/, 'Jumbo DF ping: proves MTU 9216 on the link.'],
  [/^ping .*source loopback1/, 'VTEP-to-VTEP reachability — the exact path VXLAN takes.'],
  [/^show ip ospf neighbors/, 'Adjacency state — healthy = FULL.'],
  [/^show ip route vrf/, 'Tenant routing table — EVPN routes show segid (VNI) and tunnelid (VTEP).'],
  [/^show ip route/, 'Route lookup — two *via lines = ECMP.'],
  [/^show ip pim neighbor/, 'PIM neighbors per interface.'],
  [/^show ip pim rp/, 'RP mapping for the BUM groups.'],
  [/^show nve vni/, 'VNIs on the VTEP and their BUM mode.'],
  [/^show nve peers/, 'Remote VTEPs learned via the control plane.'],
  [/^show nve ethernet-segment/, 'ES state, DF list and ESI.'],
  [/^show bgp l2vpn evpn summary/, 'EVPN sessions — a number in State/PfxRcd = Established.'],
  [/^show bgp l2vpn evpn route-type (\d)/, 'Lists the EVPN Type-$1 routes.'],
  [/^show port-channel summary/, 'Bundle state — (SU) and (P) = up and bundled.'],
  [/^show mac address-table/, 'Local MAC table.'],
  [/^show l2route evpn mac-ip/, 'MAC+IP bindings in the L2RIB.'],
  [/^show l2route evpn mac/, 'L2RIB — the MAC routes fed into BGP.']
];
function sigFor(c) {
  for (const [re, s, g] of SIG) { const m = c.match(re); if (m) return { s: s.replace('$1', m[1] || ''), g }; }
  return null;
}

/* ---------------- Wireshark display filters (real field names) ---------------- */
function wsFields(p) {
  const t = p.tag || '', f = { eth: 1, frame: 1 };
  if (p.proto !== 'ARP' && p.proto !== 'LACP') f.ip = 1;
  if (p.proto === 'ARP') { f.arp = 1; f['arp.opcode'] = /Who has|Gratuitous/.test(p.info) ? 1 : 2; if (t === 'garp') f['arp.isgratuitous'] = 1; }
  if (p.proto === 'LACP') f.lacp = 1;
  if (p.proto === 'ICMP') { f.icmp = 1; f['icmp.type'] = /reply/.test(p.info) ? 0 : 8; }
  if (p.proto === 'TCP' || p.proto === 'BGP') { f.tcp = 1; f['tcp.port'] = 179; if (t === 'syn' || t === 'synack') f['tcp.flags.syn'] = 1; if (t === 'rst') f['tcp.flags.reset'] = 1; }
  if (p.proto === 'BGP') {
    f.bgp = 1;
    f['bgp.type'] = t === 'open' ? 1 : t === 'keepalive' ? 4 : 2;
    if (p.rtype) { f['bgp.evpn.nlri.rt'] = +p.rtype; f['bgp.cap.mp.afi'] = 25; }
    if (t === 'withdraw') f['bgp.update.path_attribute.type_code'] = 15;
    if (p.seq !== undefined) f['bgp.ext_com_evpn.mmac.seq'] = p.seq;
    if (t === 'open' && /EVPN/.test(JSON.stringify(p.layers))) { f['bgp.cap.mp.afi'] = 25; f['bgp.cap.mp.safi'] = 70; }
  }
  if (p.proto === 'OSPF') { f.ospf = 1; f['ospf.msg'] = { 'ospf-hello': 1, 'ospf-dbd': 2, 'ospf-lsu': 4, 'ospf-ack': 5 }[t]; if (t === 'ospf-dbd') f['ospf.db.interface_mtu'] = 9216; }
  if (p.proto === 'PIMv2') { f.pim = 1; f['pim.type'] = /Join/.test(p.info) ? 3 : 0; }
  if (p.proto === 'VXLAN') { f.udp = 1; f.vxlan = 1; f['udp.port'] = 4789; f['vxlan.vni'] = p.vx ? p.vx.vni : ''; }
  f['ip.src'] = p.src; f['ip.dst'] = p.dst; f['ip.addr'] = [p.src, p.dst];
  return f;
}
/* supports: proto | field | field == v | field != v, combined with && / || (and/or). Returns null if not a filter expression. */
function wsMatch(p, expr) {
  const f = wsFields(p);
  const term = t => {
    t = t.trim(); if (!t) return true;
    const m = t.match(/^([a-z0-9_.]+)\s*(==|!=)\s*"?([^"]+?)"?$/i);
    if (m) {
      const v = f[m[1]]; if (v === undefined) return m[2] === '!=';
      const eq = Array.isArray(v) ? v.map(String).includes(m[3]) : String(v).toLowerCase() === m[3].toLowerCase();
      return m[2] === '==' ? eq : !eq;
    }
    if (/^[a-z0-9_.]+$/i.test(t)) return f[t] !== undefined;
    throw new Error('bad');
  };
  return expr.split(/\|\||\bor\b/).some(o => o.split(/&&|\band\b/).every(term));
}
/* which filter isolates this packet, and what to look at in it */
function wsFilterFor(p) {
  const f = wsFields(p);
  if (p.tag === 'withdraw') return 'bgp.update.path_attribute.type_code == 15';
  if (f['bgp.ext_com_evpn.mmac.seq'] !== undefined) return 'bgp.ext_com_evpn.mmac.seq == ' + f['bgp.ext_com_evpn.mmac.seq'];
  if (f['bgp.evpn.nlri.rt']) return 'bgp.evpn.nlri.rt == ' + f['bgp.evpn.nlri.rt'];
  if (p.tag === 'open') return f['bgp.cap.mp.safi'] ? 'bgp.type == 1 && bgp.cap.mp.afi == 25' : 'bgp.type == 1';
  if (p.proto === 'BGP') return 'bgp.type == ' + f['bgp.type'];
  if (p.tag === 'syn' || p.tag === 'rst') return 'tcp.port == 179';
  if (p.proto === 'OSPF') return p.tag === 'ospf-dbd' ? 'ospf.db.interface_mtu' : 'ospf.msg == ' + f['ospf.msg'];
  if (p.proto === 'PIMv2') return 'pim.type == ' + f['pim.type'];
  if (p.proto === 'VXLAN') return 'vxlan.vni == ' + f['vxlan.vni'];
  if (p.tag === 'garp') return 'arp.isgratuitous == 1';
  if (p.proto === 'ARP') return 'arp.opcode == ' + (/Who has/.test(p.info) ? 1 : 2);
  if (p.proto === 'ICMP') return 'icmp';
  return p.proto.toLowerCase().replace('pimv2', 'pim');
}
function wsExpect(p) {
  const out = [], all = [];
  const walk = (fs, li) => (fs || []).forEach(x => {
    if (x.k !== undefined && x.v !== '') all.push({ x, li });
    if (x.children) walk(x.children, li); if (x.fields) walk(x.fields, li);
  });
  p.layers.forEach((l, i) => walk(l.fields, i));
  // key field first, then highlighted fields from the protocol layers (skip Frame / Ethernet / IP noise like TTL)
  const key = all.find(a => a.x.k === p.keyField); if (key) out.push(key.x);
  all.forEach(a => { if (a.x.hl && a.li >= 3 && out.length < 3 && !out.some(o => o.k === a.x.k)) out.push(a.x); });
  all.forEach(a => { if (a.x.hl && out.length < 2 && !out.some(o => o.k === a.x.k)) out.push(a.x); });
  return out.map(x => `<b>${x.k}:</b> ${x.v}`).join(' · ');
}
