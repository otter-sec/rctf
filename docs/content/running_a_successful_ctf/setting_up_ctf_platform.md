# Setting up a CTF Platform

There are two primary CTF platforms that are publicly available:

- [rCTF](https://rctf.osec.io) (you are here!)

- [CTFd](https://ctfd.io/)

This guide will focus on using rCTF, though this guide would still be similar no matter which platform is being used.

## Prerequisites

For this guide, you'll need at least the following:

- domain name to host your CTF platform and challenges on (e.g. example.com)
- a VPS to host the CTF platform from any provider (Hetzner, Vultr, DigitalOcean, GCP, AWS, etc.), preferably with at least
  2 cores and 4 GiB RAM. The guide uses Ubuntu 24.04, but you are free to also use any other preferred OS of choice.

Additionally, you'll want a TLS certificate either by using something like [Cloudflare](https://cloudflare.com) with proxied
host or [certbot](https://certbot.eff.org/instructions) to manually provision it.

All the examples will use `example.com` which refers to the domain name hosting the CTF platform, and `123.123.123.123`
which is the deployed VPS hosting the CTF platform. All these occurrences should be replaced with your own values respectively.

## Installing rCTF

After you've deployed a VPS in your preferred provider, you'll need to SSH into it using `ssh root@123.123.123.123`. All
the subsequent commands should be run inside the VPS as the root user.

We provide a simple installation script that sets up rCTF automatically:

```bash
curl -L https://get.rctf.osec.io | sh
```

When prompted if rCTF should be started, answer `y`. The installation script configures rCTF into the `/opt/rctf` directory
which will contain all of our rCTF configuration and from which commands to restart rCTF should be run.

The `/opt/rctf/rctf.d` folder contains the configuration files where your instance can be customized, and you can find more
instructions [here](../rctf/configuration.md). Consider configuring at least the following things:

- CTF name, description, image, origin, home content, start and end time
- Email configuration if you want to verify emails (do note that certain providers have manual verification steps before you can send emails, so this should be done well in advance)
- `proxy.cloudflare` if behind Cloudflare
- GCS for storing challenges to decrease the load on the CTF platform (see instructions [here](../rctf/providers/uploads/gcs.md))

After each configuration change, you need to restart rCTF by running the following command:

```bash
cd /opt/rctf && docker compose up -d --force-recreate --build
```

## Setting up the Web Server

By default, the CTF platform is only directly accessible from the VPS itself. For this, we'll set up Nginx to act as a
webserver handling TLS and proxying the traffic forward to rCTF. It is also helpful to have Cloudflare in front so that you
can deal with DDoS attacks and implement easy rate-limiting.

### Using Cloudflare

In Cloudflare, navigate to your domain > DNS > Records and create an `A` record pointing to `123.123.123.123` (your VPS IP). The
orange cloud should be enabled. Then, navigate to the SSL/TLS > Overview tab, and make sure SSL/TLS encryption is set to `Full (strict)`.
After that, in SSL/TLS > Origin Server tab, create a new certificate where all the settings are default except the hostname is set to
the domain name where you'll run the CTF platform, e.g. `ctf.example.com`. Copy the origin certificate into the `/etc/ssl/cf_fullchain.pem` file,
and the private key into the `/etc/ssl/cf_privkey.pem` file.

We will setup a firewall using UFW to only allow Cloudflare IPs to access the web server:

```bash
ufw allow 22
# source: https://github.com/Paul-Reed/cloudflare-ufw/blob/master/cloudflare-ufw.sh
for cfip in `curl -sw '\n' https://www.cloudflare.com/ips-v{4,6}`; do ufw allow proto tcp from $cfip comment 'Cloudflare IP'; done
ufw enable # answer `y` when prompted regarding enabling firewall
```

Now, we can install Nginx using `apt update && apt install -y nginx`. Then, we create `/etc/nginx/sites-available/rctf.conf` with the following
contents (note the comments on stuff you need to update):

```nginx
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
    # as this otherwise lets you spoof the IP (not that this is particularly useful though).
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

Then, we create a symlink from `/etc/nginx/sites-available/rctf.conf` to `/etc/nginx/sites-enabled/rctf.conf` so that Nginx
loads our configuration, and apply the change:

```bash
ln -s /etc/nginx/sites-available/rctf.conf /etc/nginx/sites-enabled/rctf.conf
nginx -t && nginx -s reload
```

Every time you update the configuration, you'll need to run `nginx -t && nginx -s reload` to validate and apply your configuration changes.
After all these steps are done, you should be able to visit `https://ctf.example.com` and view rCTF!

### Using something else

In your DNS registrar, configure a new `A` DNS record pointing to `123.123.123.123` (your VPS IP). Then, follow the instructions
on [certbot's website](https://certbot.eff.org/instructions?ws=nginx&os=pip) on how to provision a certificate.

Now, we can install Nginx using `apt update && apt install -y nginx`. Then, we create `/etc/nginx/sites-available/rctf.conf` with the following
contents (note the comments on stuff you need to update):

```nginx
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

Then, we create a symlink from `/etc/nginx/sites-available/rctf.conf` to `/etc/nginx/sites-enabled/rctf.conf` so that Nginx
loads our configuration, and apply the change:

```bash
ln -s /etc/nginx/sites-available/rctf.conf /etc/nginx/sites-enabled/rctf.conf
nginx -t && nginx -s reload
```

Every time you update the configuration, you'll need to run `nginx -t && nginx -s reload` to validate and apply your configuration changes.
After all these steps are done, you should be able to visit `https://ctf.example.com` and view rCTF!

## Creating Admin Account

Register a new account in rCTF. Then, in the VPS running rCTF we're able to run the following commands to make our registered
account an admin account:

```bash
docker exec -it rctf-postgres-1 bash
# inside the postgres container:
psql -U rctf
# inside the postgress shell:
UPDATE users SET perms = 3 WHERE email = 'my.email@example.com';
```

After becoming an admin, you can confirm that you have permissions to create challenges by navigating to `https://ctf.example.com/admin/challs`.
If the page does not load or you don't see the challenge upload screen, something went wrong and you should double check the output of the
previous commands when updating your permissions.
