Part A: Create the AWS account (about 20 min)

1. Go to https://signup.aws.amazon.com/
2. Email and account name: use your own email and name the account tact-hackathon. Enter the code AWS emails you.
3. Root password: choose a strong one and save it somewhere safe.
4. Plan: choose Paid plan, not Free. The Free plan blocks some expensive services, and the GPU server may be one of them. As far as I know, new accounts get the sign-up credits on either plan, and they will cover our spend. Check the credit balance under Billing after sign-up.
5. Contact info: choose Personal and enter your Indian address. Your account will be with AISPL (Amazon Internet Services Pvt. Ltd.), which is normal for India.
6. Payment: a debit or credit card with international/online transactions turned on. AWS charges about ₹2 to check the card and refunds it. If the card is rejected, turn on international use in your bank app, or try another card.
7. PAN: optional, you can skip it.
8. Phone check: enter the SMS or call code.
9. Support plan: choose Basic (free).
10. Wait for the "account activated" email. It usually takes a hours.

Part B: Safety settings (5 min)

1. Budget alert: go to https://console.aws.amazon.com/billing/home#/budgets and click Create budget. Pick the Monthly cost budget template, set $15, and enter your email. You'll get an email if spending goes over that.
2. (Recommended) Turn on MFA for the root user: top-right menu, then Security credentials, then Assign MFA device, using an authenticator app on your
   phone.

Part C: Set up what the project needs (about 15 min)

First set the region in the top-right of the console to "US East (N. Virginia)".

C1. Check that Bedrock works. This is the biggest risk, so do it first.
https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/
Open Playground, then Chat, choose Amazon Nova Lite and type "hi".
- If it replies, you're done with this step.
- If it asks for model access, request access to Nova Lite and Titan Text Embeddings V2.

C2. Ask for a GPU limit increase.
https://us-east-1.console.aws.amazon.com/servicequotas/home/services/ec2/quotas/L-DB2E81BA
1. "Running On-Demand G and VT instances": click Request incre
2. Also note the current value of "Running On-Demand Standard instances":
   https://us-east-1.console.aws.amazon.com/servicequotas/home7A

If the GPU increase is slow or refused, no problem. I just updated the launch script (infra/decider_ec2.py) to try a regular 8-core server if the GPU fails, then a 4-core one, which fits the default limit on new accounts. It's slower, but it works.

C3. Create an IAM user for my scripts.
https://us-east-1.console.aws.amazon.com/iam/home#/users/creat
1. Name it tact-hackathon and click Next.
2. Choose Attach policies directly and tick:
   - AmazonBedrockFullAccess
   - AmazonEC2FullAccess
   - AmazonSSMReadOnlyAccess
3. Click Next, then Create user.

C4. Create an access key.
1. Open the user, go to the Security credentials tab and click Create access key.
2. Choose Command Line Interface (CLI), tick the confirmation box, then click Create.
3. Keep the page open, or download the .csv file.

C5. Connect the key to this laptop. Open a new, separate PowerShell window (not this chat) and run:
aws configure
- Paste the Access key ID and Secret access key.
- Region: us-east-1
- Output format: json

⚠️ Never paste the keys here.

C6. Log in to GitHub. If you don't have a GitHub account, create one at https://github.com/signup. Then, in the same PowerShell window, run:
gh auth login
Choose GitHub.com, then HTTPS, then log in with a web browser.

Send me this when done

▎ AWS done
▎ 1. Did Nova Lite reply in the playground? (yes/no, or the error)
▎ 2. GPU request: approved, pending or denied? Standard-instances value: ___
▎ 3. GitHub login: yes/no

I'll then check the connection, launch the server and run everything.

Cost and timeline

- Cost: the GPU server is about $0.80/hr, and I'll stop it whe whole project should come to roughly $5–10, which the sign-upcredits should cover.
- Timeline: add about 40 minutes for account setup to the earlurs in total. That still finishes well before your 9 AM target.
- One delay risk: account activation sometimes takes a few hours. If that happens, I'll write the article and video script while we wait, so the time isn't wasted.

Sources: AWS News Blog: Free Tier update, up to $200 in credits · DEV: AWS Free Tier 2025 changes