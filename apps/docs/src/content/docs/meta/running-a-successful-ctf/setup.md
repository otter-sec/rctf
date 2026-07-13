---
title: Setting up a CTF platform
description: Complete guide to deploying rCTF, configuring Nginx with TLS, and creating admin accounts.
order: 3
---

This walkthrough installs rCTF on an Ubuntu VPS, puts Nginx in front of it, and enables TLS through Cloudflare or Certbot.

## Prerequisites

You will need:

- A domain name, such as `example.com`
- An Ubuntu 24.04 VPS with at least 2 CPU cores and 4 GiB of memory

The TLS steps cover either a proxied [Cloudflare](https://cloudflare.com) hostname or a certificate issued with [Certbot](https://certbot.eff.org/instructions).

:::note
Replace `example.com` and `123.123.123.123` throughout the guide with your domain and VPS address.
:::

## Installing rCTF

:::steps
1. **SSH into your VPS**

   Connect to the new server:

   ```ansi
   $ <red>ssh</red> root@123.123.123.123
   ```

   Run the remaining commands on the VPS as root.

2. **Run the installation script**

   Run the installer:

   ```ansi
   $ <red>curl</red> <dim>-L</dim> https://get.rctf.osec.io | <red>sh</red>
   ```

   Answer `y` when asked whether to start rCTF. The installer puts the deployment and configuration under `/opt/rctf/{:dir}`.

3. **Configure your instance**

   Edit the files in `/opt/rctf/rctf.d/{:dir}`. At minimum, review the following settings in the [configuration reference](/configuration):

   - CTF name, description, image, public origin, homepage, and start and end times
   - Email provider, if registration should verify addresses. Some providers must approve the account before it can send mail, so configure this early.
   - `<red>proxy.cloudflare</red>` if behind Cloudflare
   - An [object storage provider](/providers/uploads), if uploads should not be stored on the VPS

4. **Restart rCTF after configuration changes**

   Recreate the service after changing configuration:

   ```ansi
   $ <red>cd</red> /opt/rctf && <red>docker</red> compose up <dim>-d</dim> <dim>--force-recreate</dim> <dim>--build</dim>
   ```
:::

## Setting up the web server

rCTF listens only on the VPS loopback address. Nginx terminates TLS and forwards public traffic to it. Cloudflare can sit in front of Nginx for proxying and DDoS protection.

:::::tabs
::::tab[Using Cloudflare]
:::steps
1. **Configure Cloudflare DNS**

   Under DNS > Records, create a proxied `A` record for `123.123.123.123`. Then set SSL/TLS encryption to `Full (strict)`.

2. **Create origin certificate**

   Under SSL/TLS > Origin Server, create a certificate for `ctf.example.com`. Save the certificate as `/etc/ssl/cf_fullchain.pem{:file}` and its private key as `/etc/ssl/cf_privkey.pem{:file}`.

3. **Configure UFW firewall**

   Allow SSH and Cloudflare traffic, then enable UFW:

   ```ansi
   $ <red>ufw</red> allow 22
   $ for cfip in `<red>curl</red> <dim>-sw</dim> <green>'\n'</green> https://www.cloudflare.com/ips-v{4,6}`; do <red>ufw</red> allow proto tcp from <yellow>$cfip</yellow> comment <green>'Cloudflare IP'</green>; done
   $ <red>ufw</red> enable   <dim># answer `y` when prompted regarding enabling firewall</dim>
   ```

4. **Install and configure Nginx**

   Install Nginx with `$ <red>apt</red> update && <red>apt</red> install <dim>-y</dim> nginx`, then create `/etc/nginx/sites-available/rctf.conf{:file}`. Update the marked hostname.

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

   ```ansi
   $ <red>ln</red> <dim>-s</dim> /etc/nginx/sites-available/rctf.conf /etc/nginx/sites-enabled/rctf.conf
   $ <red>nginx</red> <dim>-t</dim> && <red>nginx</red> <dim>-s</dim> reload
   ```

   Use the same command after later Nginx changes. rCTF should now be available at `https://ctf.example.com`.
:::
::::
::::tab[Using certbot]
:::steps
1. **Configure DNS**

   Create an `A` record pointing to `123.123.123.123`, then follow the [Certbot instructions](https://certbot.eff.org/instructions?ws=nginx&os=pip) for Nginx.

2. **Install and configure Nginx**

   Install Nginx with `$ <red>apt</red> update && <red>apt</red> install <dim>-y</dim> nginx`, then create `/etc/nginx/sites-available/rctf.conf{:file}`. Update the marked hostname and certificate paths.

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

   ```ansi
   $ <red>ln</red> <dim>-s</dim> /etc/nginx/sites-available/rctf.conf /etc/nginx/sites-enabled/rctf.conf
   $ <red>nginx</red> <dim>-t</dim> && <red>nginx</red> <dim>-s</dim> reload
   ```

   Use the same command after later Nginx changes. rCTF should now be available at `https://ctf.example.com`.
:::
::::
:::::

## Creating an admin account

:::steps
1. **Register a new account**

   Register a new account in rCTF.

2. **Update permissions via database**

   On the VPS, open PostgreSQL and grant the account admin permissions:

   ```ansi
   $ <red>docker</red> exec <dim>-it</dim> rctf-postgres-1 <red>bash</red>
   ```

   ```ansi title="Inside the postgres container" output="sql"
   $ <red>psql</red> <dim>-U</dim> rctf
   UPDATE users SET perms = 3 WHERE email = 'my.email@example.com';
   ```

3. **Verify admin access**

   Open `https://ctf.example.com/admin/challs` and confirm that the challenge editor loads.

   :::warning
   If the editor is missing, check that the SQL update matched the account's email and completed successfully.
   :::
:::
