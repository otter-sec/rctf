# After the CTF

## Uploading Scoreboard to CTFtime

We will update our admin user to also have permissions to fetch the final scoreboard in the format that CTFtime expects:

```bash
docker exec -it rctf-postgres-1 bash
# inside the postgres container:
psql -U rctf
# inside the postgress shell:
UPDATE users SET perms = 7 WHERE email = '[...]';
```

Then, login into the CTF platform as the admin account and run the following snippet in your browser's console:

```js
localStorage.getItem('token')
```

Take the authentication token and remove the `"` quotes around it, and replace `TOKEN` in the next command to get the scoreboard export:

```bash
curl https://ctf.example.com/api/v1/integrations/ctftime/leaderboard \
  -H "Authorization: Bearer TOKEN"
```

Finally, you can submit the output of the command in the CTFtime event dashboard. Do note that it may take around an hour for points to be
awarded for previously organized CTFs, and new CTFs will award points only after a week from the moment it was organized when the weight voting
period for it ends.

## Prize Distribution

If your CTF has prizes, you can fetch the team emails through the database (as after all, anyone can claim over Discord to be part of any team):

```bash
docker exec -it rctf-postgres-1 bash
# inside the postgres container:
psql -U rctf
# inside the postgress shell:
SELECT * FROM users WHERE name IN ('Team 1', 'Team 2', 'Team 3');
```

If you use divisions, you can filter the scoreboard by divisions as well if needed.

## Feedback

It is common to also release a feedback form (e.g. Google Forms) where feedback is requested regarding various aspects of the competition:

- Infrastructure (were there any issues?)

- Challenges (were some challenges badly/well-designed? should there be more/less of specific type of challenges?)

- General organization (free-form feedback, communicating towards competitors and vice versa, and so on)

These are especially helpful to review before organizing next year's CTF to improve the experience of the CTF.

## Tearing Down Infrastructure

There are a couple of factors that decide when the infrastructure should be torn down:

- Budget

- Desire for writeups (as competitors compare their solution against the remote)

- Willingness to check that challenge remotes are still functional, or alternatively running them until they break

Most CTFs scale down the infrastructure right after the CTF and aim to have at least a couple of days when instances
are still accessible but with minimal maintenance. In the case of infrastructure being sponsored by Google, usually one can leave
it running until most of the credits are used.

Here is a checklist of things to make sure have been deleted:

- CTF platform (consider making backup of this so it's easier to configure next year)

- remote instances (kCTF, VPSes, instancer, instancer GKE)

- various other cloud resources (IP addresses, DNS records, and so on)
