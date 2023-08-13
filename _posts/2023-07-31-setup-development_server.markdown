---
layout: post
title: Setup Local DevBox
date: 2022-07-31 23:30:00 +0530
description: You’ll find this post in your `_posts` directory. Go ahead and edit it and re-build the site to see your changes. # Add post description (optional)
img: Dev-Box.jpg # Add image post (optional)
fig-caption: # Add figcaption (optional)
tags: [Jenkins, NetDevOps, Ansible, GitHub, EveNG]
---
# DevBox on Ubuntu

## Configure WSL2

As most of us are on windows machine, a quick way to setup a DevBox is on Windows Subsystem for Linux (WSL). My preferred choice of linux distribution for this would be Ubuntu 22.04. 

* Start with below commands to enabled Window optional features and restart th computer. Make sure virtualization is enabled in BIOS. For e.g. I have Gigabyte motherboard and enable SVM mode for AMD-v.
```
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux
Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform
```
* Then update WSL to version 2. To do it, go to https://docs.microsoft.com/windows/wsl/wsl2-kernel, download wsl_update_x64.msi, and install it. Make WSL2 a default architecture for new Linux distros with below command.
```
wsl --set-default-version 2
```
* Now install Ubuntu with below command.
```
wsl --install -d ubuntu
```
* List all installed distributions in WSL. Use -v option to get the state of the distribution.
```
wsl -l -v
```
* Run the Ubuntu distribution.
```
wsl -d Ubuntu
```
You can terminate the distribution using -t option.

* Check the Ubuntu version
```
lsb-release -a
```
* Update the package list in Ubuntu
```
sudo apt update
```

## Install Cisco NSO

* Install Java

```
sudo apt install openjdk-17-jdk -y
```

Check Java version **java --version**

* Downloaded fre trial of Cisco NSO from Cisco official website. In my case it's nso-6.1-freetrial.linux.x86_64.signed.bin. This is for linux operating system. Unpack the package to get nso-6.1.linux.x86_64.installer.bin.

```
sh nso-6.1-freetrial.linux.x86_64.signed.bin
```

* Make a folder in $HOME directory and run the installer.
```
sh nso-6.1.linux.x86_64.installer.bin --local-install ~/nso-6.1
```
* Now download the NEDs from Cisco official site. In  my case, I have downloaded **ncs-6.1-cisco-ios-6.92.8-freetrial.signed.bin** and **ncs-6.1-cisco-iosxr-7.49-freetrial.signed.bin**. Unpack both the files and move all **.tar.gz** files to **ned** folder.
```
sh ncs-6.1-cisco-ios-6.92.8-freetrial.signed.bin
sh ncs-6.1-cisco-iosxr-7.49-freetrial.signed.bin
mv *.tar.gz ~/nso-6.1/packages/neds/
```
* Goto ned folder and extract all tar file.
```
tar -zxvf ncs-6.1-cisco-iosxr-7.49.tar.gz
tar -zxvf ncs-6.1-cisco-ios-6.92.tar.gz
```
* We need to source **ncsrc**. This is shell script for bash that will setup your PATH and other environment variables for NSO. Post this you will be able to run **ncs** command directly from bash.
```
source $HOME/nso-6.0/ncsrc
```
* Now create an NSO instance and provide the directory name where you want your NSO instance to be placed. Directory will be created automatically. In my NSO instance below, I have only included IOS and IOSXR neds.
```
ncs-setup --package ~/nso-6.1/packages/neds/cisco-ios-cli-6.92   --package ~/nso-6.1/packages/neds/cisco-iosxr-cli-7.49   --dest nso-instance
```
* Go to the NSO instance directory and start NSO instance. 
```
cd ~\nso-6.1\nso-instance
ncs
```
* Check the NCS status.
```
ncs --status | grep status
```

## Install Python and create Virtual environment

* Install Python3 and Pip3
```
sudo apt install python3
sudo apt install python3.10-venv
sudo apt install pip
```
* Create and move to a project folder. Enable virtual environment and activate.
```
python3 -m venv .venv
source .venv/bin/activate
```
* Clone below repo in the project folder.
```
git clone https://github.com/CiscoDevNet/virlutils.git
```
* Install all packages as mentioned in **requirement.txt**
```
sudo pip install -r ./virlutils/requirements.txt
```
Check all installed packages with command **pip freeze**.

* Setup the **VIRL utilities** as below
```
sudo python3 setup.py install
```
* Create **.virlrc** file in $HOME directory and enter below lines into it. We will run CML in Cisco DevNet Sandbox and below are the credentials for those. This mostly remain same, but change it if you see different.
```
VIRL_HOST=10.10.20.161
VIRL_USERNAME=developer
VIRL_PASSWORD=C1sco12345
CML_VERIFY_CERT=False
```

## Reserve a CML sandbox and sync/operate with CML command line 

* Login to **https://devnetsandbox.cisco.com/RM/Diagram/Index/685f774a-a5d6-4df5-a324-3774217d0e6b?diagramType=Topology** and reserve a lab

* Once lab is ready, connect through VPN. Credentials and steps to install AnyConnect will be available in the lab document/process.

* Check the list of existing labs and note down the ID

```
cml ls
```

* Stop and wipe the current lab

```
cml down --id 414a4c8f-3ead-4a0e-8cd9-4dd8eb4a1b6f
cml wipe lab --id 414a4c8f-3ead-4a0e-8cd9-4dd8eb4a1b6f
```

* Search existing labs available in repository and then run one of that lab
```
cml search
```
Note down the lab name to run, then use below command to provision and run that lab.

```
cml up --provision virlfiles/2-ios-router
```
You need to modify the CML topology to add an unmanaged switch and connect all routers to it. Then connect that unmamanged switch to External Connector (configured as bridge).


* Check the nodes

```
cml ls
cml use -id 29fbcce2-d36d-4246-a4ce-f5836f00c35e
cml nodes
```

* Jump into your NSO instance using the ncs_cli command. This command takes several options - we'll use -C to specify we'd like a "Cisco style" command line interface (the default is a Juniper style), and -u admin to login as the "admin" user. Make sure **--noaaa** option is included otherwise many commands will not be visible. 
```
ncs_cli -u admin -C --noaaa
```
Enter config mode with **config** command

* We will setup a new authgroup called "labadmin". This group will use a default username/password combination of cisco / cisco for devices, with a "secondary" (ie 'enable') password also of cisco. These commands will set this up.

```
devices authgroups group labadmin
default-map remote-name cisco
default-map remote-password cisco
default-map remote-secondary-password cisco
```

Don't forget to commit the configuration with **commit** command 

* In the $HOME directory, create **nso-inventory.cfg** file in below format and mention the node details as mentioned in lab. If IP addresses are not available in **cml nodes** output, then we can login to console of the devices using **cml console router1** command and can even do changes. 

```
devices device router1
 address 192.168.0.1
 authgroup labadmin
 ssh host-key-verification none
 device-type cli ned-id cisco-ios-cli-6.92
 device-type cli protocol ssh
 state admin-state unlocked
 !
!
devices device router2
 address 192.168.0.2
 authgroup labadmin
 ssh host-key-verification none
 device-type cli ned-id cisco-ios-cli-6.92
 device-type cli protocol ssh
 state admin-state unlocked
 !
!
```
* Now read the file created in above step and stage it for commit.

```
load merge nso-inventory.cfg
```
You can now see the device list using command **show devices list**

* Make NSO communicate with these devices

```
devices connect
```

devices device-group IOS-DEVICES check-sync
devices device-group IOS-DEVICES sync-from

## Install Docker and create container for GitLab and Jenkins

* Install docker and start the service
```
  sudo apt-get update
  sudo apt-get install ca-certificates curl gnupg
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg

  echo   "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" |   sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

  sudo apt-get update
  sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo /etc/init.d/docker start
```

* Install GitLab container
```
sudo docker run --detach \
                --publish 1443:443 \ 
                --publish 4080:80 \
                --publish 1001:22 \ 
                --name gitlab \
                --restart always \   
                --volume gitlab_config:/etc/gitlab \  
                --volume gitlab_logs:/var/log/gitlab \  
                --volume gitlab_data:/var/opt/gitlab \ 
                --shm-size 2gb \
                gitlab/gitlab-ee:latest
```
GitLab then can be access by opening the URL **http://localhost:4080** in browser.

* Install Jenkins container

```
docker run -d \
    --name jenkins \
    -p 9080:8080 \
    -p 50000:50000 \
    --restart always \
    -v jenkins_home:/var/jenkins_home \
    jenkins/jenkins:lts-jdk11
```
* Check status of both containers.

```
sudo docker ps
```
* To get the intial admin password for Jenkins, we have to get inside the container to see the content of **initialAdminPassword**. As we open the URL **http://localhost:9080** in browser first time we login, we need to put admin password mentioned **initialAdminPassword** file.

```
sudo docker exec -it gitlab /bin/bash
cat /var/jenkins_home/secrets/initialAdminPassword
```
## Install and Configure Ansible in Ubuntu

* Run below commands on Ubuntu bash shell to install Ansible. This is well documented in https://docs.ansible.com/ansible/latest/installation_guide/installation_distros.html#installing-ansible-on-ubuntu

```
sudo apt update
sudo apt install software-properties-common
sudo add-apt-repository --yes --update ppa:ansible/ansible
sudo apt install ansible
```
* Install cisco.ios modules by running command **ansible-galaxy collection cisco.ios**. Once installed, modules can be seen under path ~/.ansible/collections/ansible_collections/cisco/ios/plugins/modules. In our example we will modify the ACL on a IOS router, and for that we will use **ios_acls.py** module.



