# node-stripe-data
Get Stripe customers and subscriptions and make usable for ACL purposes.


### Setup

The `package.json` file should contain Stripe keys to use.
```
{
  "config": {
    "stripeKeys: {
      "stripe-product": "live-secret-key"
    }
  }
}
```