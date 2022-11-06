---
layout: post
title: Lab Setup - NSX for vSphere 
date: 2022-08-03 00:15:00 +0530
description: You’ll find this post in your `_posts` directory. Go ahead and edit it and re-build the site to see your changes. # Add post description (optional)
img: nsx.png # Add image post (optional)
fig-caption: # Add figcaption (optional)
tags: [NSX]
---
# NSX-v lab setup demo

Watch this video to find out how I have setup my lab for NSX-v. In this lab, I have used nested ESXi for hosts nodes and vCenter. 
Vyos router and Ubuntu DNS is sitting outside under VMWare workstation to communicate with Application natively from my Desktop. I have run through the concept of ESG, DLR, SNAT, DNAT and LB in this lab, have not deployed and Distributed Firewall though. LB is deployed as onearm mode, and any traffic comming from outside will be DNAT to frontend of LB, and will then load balanced to respective Application servers. I have two App servers for testing. There are firewall rules open on EDGE for allowing HTTPS and PING.

[![Helm]({{site.baseurl}}/assets/img/nsx.png)](https://youtu.be/rW-_FmxuMPk)