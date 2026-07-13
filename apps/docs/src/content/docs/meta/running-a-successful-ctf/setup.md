---
title: Setting up a CTF platform
description: Complete guide to deploying rCTF, configuring Nginx with TLS, and creating admin accounts.
order: 3
---

There are two main CTF platforms in public use:

- [rCTF](https://rctf.osec.io) (you are here!)

- [CTFd](https://ctfd.io/)

This guide focuses on rCTF, but the setup looks similar on either platform.

## Prerequisites

For this guide, you'll need at least the following:

- A domain name to host your CTF platform and challenges on (e.g. `example.com`)
- A VPS to host the CTF platform from any provider (Hetzner, Vultr, DigitalOcean, GCP, AWS, etc.), preferably with at least 2 cores and 4 GiB RAM. The guide uses Ubuntu 24.04, but you are free to also use any other preferred OS of choice.

You'll also want a TLS certificate, either through [Cloudflare](https://cloudflare.com) with a proxied host or through [certbot](https://certbot.eff.org/instructions) for manual provisioning.

:::note
All the examples will use `example.com` which refers to the domain name hosting the CTF platform, and `123.123.123.123` which is the deployed VPS hosting the CTF platform. All these occurrences should be replaced with your own values respectively.
:::

## Installing rCTF

:::steps
1. **SSH into your VPS**

   After you've deployed a VPS in your preferred provider, you'll need to SSH into it using:

   ```console
   $ <red>ssh</red> root@123.123.123.123
   ```

   All the subsequent commands should be run inside the VPS as the root user.

2. **Run the installation script**

   We provide a simple installation script that sets up rCTF automatically:

   ```console
   $ <red>curl</red> <dim>-L</dim> https://get.rctf.osec.io | <red>sh</red>
   ```

   When prompted if rCTF should be started, answer `y`. The installation script configures rCTF into the `/opt/rctf/{:dir}` directory which will contain all of our rCTF configuration and from which commands to restart rCTF should be run.

3. **Configure your instance**

   The `/opt/rctf/rctf.d/{:dir}` folder contains the configuration files where your instance can be customized, and you can find more instructions [here](/configuration). Consider configuring at least the following:

   - CTF name, description, image, origin, home content, start and end time
   - Email configuration if you want to verify emails (do note that certain providers have manual verification steps before you can send emails, so this should be done well in advance)
   - `<red>proxy.cloudflare</red>` if behind Cloudflare
   - GCS for storing challenges to decrease the load on the CTF platform (see instructions [here](/providers/uploads))

4. **Restart rCTF after configuration changes**

   After each configuration change, you need to restart rCTF by running the following command:

   ```console
   $ <red>cd</red> /opt/rctf && <red>docker</red> compose up <dim>-d</dim> <dim>--force-recreate</dim>
   ```
:::

## Setting up the web server

By default, the CTF platform is only accessible from the VPS itself. To expose it, set up Nginx as a webserver that handles TLS and proxies traffic to rCTF. Putting Cloudflare in front of that also helps with DDoS attacks and gives you easy rate-limiting.

:::::tabs
::::tab[Using Cloudflare]
:::steps
1. **Configure Cloudflare DNS**

   In Cloudflare, navigate to your domain > DNS > Records and create an `A` record pointing to `123.123.123.123` (your VPS IP). The orange cloud should be enabled. Then, navigate to the SSL/TLS > Overview tab, and make sure SSL/TLS encryption is set to `Full (strict)`.

2. **Create origin certificate**

   In SSL/TLS > Origin Server tab, create a new certificate where all the settings are default except the hostname is set to the domain name where you'll run the CTF platform, e.g. `ctf.example.com`. Copy the origin certificate into the `/etc/ssl/cf_fullchain.pem{:file}` file, and the private key into the `/etc/ssl/cf_privkey.pem{:file}` file.

3. **Configure UFW firewall**

   We will setup a firewall using UFW to only allow Cloudflare IPs to access the web server:

   ```console
   $ <red>ufw</red> allow 22
   $ for cfip in `<red>curl</red> <dim>-sw</dim> '\n' https://www.cloudflare.com/ips-v{4,6}`; do <red>ufw</red> allow proto tcp from $cfip comment 'Cloudflare IP'; done
   $ <red>ufw</red> enable   <dim># answer `y` when prompted regarding enabling firewall</dim>
   ```

4. **Install and configure Nginx**

   Install Nginx using `$ <red>apt</red> update && <red>apt</red> install <dim>-y</dim> nginx`. Then, create `/etc/nginx/sites-available/rctf.conf{:file}` with the following contents (note the comments on stuff you need to update):

   ```nginx title="/etc/nginx/sites-available/rctf.conf" showLineNumbers mark={4,15}
   # Redirect HTTP -> HTTPS
   server {
       listen 80;
       server_name ctf.example.com; # TODO: update me to CTF platform domain name
       return 301 https://$host$request_uri;
   }

   map $http_upgrade $connection_upgrade {
       default upgrade;
       ''  close;
   }

   server {
       listen 443 ssl;
       server_name ctf.example.com; # TODO: update me to CTF platform domain name
       ssl_certificate /etc/ssl/cf_fullchain.pem;
       ssl_certificate_key /etc/ssl/cf_privkey.pem;

       # NOTE: It is *very* important to only whitelist Cloudflare IPs for the webserver (which we'll do in the following steps),
       # as this otherwise lets you spoof the IP.
       set_real_ip_from 0.0.0.0/0;
       real_ip_header CF-Connecting-IP;

       location / {
           # Uncomment the following if you want to only allow yourself to access the platform for now.
           #allow [your IP];
           #deny all;

           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection $connection_upgrade;
           proxy_pass http://127.0.0.1:8080/;
           proxy_buffering off;
       }
   }
   ```

5. **Enable the configuration**

   Create a symlink so Nginx loads the configuration, then apply it:

   ```console
   $ <red>ln</red> <dim>-s</dim> /etc/nginx/sites-available/rctf.conf /etc/nginx/sites-enabled/rctf.conf
   $ <red>nginx</red> <dim>-t</dim> && <red>nginx</red> <dim>-s</dim> reload
   ```

   Every time you update the configuration, run `$ <red>nginx</red> <dim>-t</dim> && <red>nginx</red> <dim>-s</dim> reload` to validate and apply changes. After all these steps, you should be able to visit `https://ctf.example.com` and view rCTF!
:::
::::
::::tab[Using certbot]
:::steps
1. **Configure DNS**

   In your DNS registrar, configure a new `A` DNS record pointing to `123.123.123.123` (your VPS IP). Then, follow the instructions on [certbot's website](https://certbot.eff.org/instructions?ws=nginx&os=pip) on how to provision a certificate.

2. **Install and configure Nginx**

   Install Nginx using `$ <red>apt</red> update && <red>apt</red> install <dim>-y</dim> nginx`. Then, create `/etc/nginx/sites-available/rctf.conf{:file}` with the following contents (note the comments on stuff you need to update):

   ```nginx title="/etc/nginx/sites-available/rctf.conf" showLineNumbers mark={4,15-17}
   # Redirect HTTP -> HTTPS
   server {
       listen 80;
       server_name ctf.example.com; # TODO: update me to CTF platform domain name
       return 301 https://$host$request_uri;
   }

   map $http_upgrade $connection_upgrade {
       default upgrade;
       ''  close;
   }

   server {
       listen 443 ssl;
       server_name ctf.example.com; # TODO: update me to CTF platform domain name
       ssl_certificate /etc/letsencrypt/live/ctf.example.com/fullchain.pem; # TODO: update path to CTF platform domain name
       ssl_certificate_key /etc/letsencrypt/live/ctf.example.com/privkey.pem; # TODO: update path to CTF platform domain name

       location / {
           # Uncomment the following if you want to only allow yourself to access the platform for now.
           #allow [your IP];
           #deny all;

           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection $connection_upgrade;
           proxy_pass http://127.0.0.1:8080/;
           proxy_buffering off;
       }
   }
   ```

3. **Enable the configuration**

   Create a symlink so Nginx loads the configuration, then apply it:

   ```console
   $ <red>ln</red> <dim>-s</dim> /etc/nginx/sites-available/rctf.conf /etc/nginx/sites-enabled/rctf.conf
   $ <red>nginx</red> <dim>-t</dim> && <red>nginx</red> <dim>-s</dim> reload
   ```

   Every time you update the configuration, run `$ <red>nginx</red> <dim>-t</dim> && <red>nginx</red> <dim>-s</dim> reload` to validate and apply changes. After all these steps, you should be able to visit `https://ctf.example.com` and view rCTF!
:::
::::
:::::

## Creating an admin account

:::steps
1. **Register a new account**

   Register a new account in rCTF.

2. **Update permissions via database**

   In the VPS running rCTF, run the following commands to grant the account admin permissions:

   ```console
   $ <red>docker</red> exec <dim>-it</dim> rctf-postgres-1 bash
   ```

   ```console title="Inside the postgres container" output="sql"
   $ <red>psql</red> <dim>-U</dim> rctf
   UPDATE users SET perms = 3 WHERE email = 'my.email@example.com';
   ```

3. **Verify admin access**

   Confirm that you have permissions to create challenges by navigating to `https://ctf.example.com/admin/challs`.

   :::warning
   If the page does not load or you don't see the challenge upload screen, something went wrong and you should double check the output of the previous commands when updating your permissions.
   :::
:::
