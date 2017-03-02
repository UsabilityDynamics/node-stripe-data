# node-stripe-data
Get Stripe customers and subscriptions and make usable for ACL purposes.


### Usage

```
req._client = req.clientSubscription( 'stripe-product', 'stripe-subscription-plan', 'unique-site-id' );
```


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

or

```
// Set stripe keys on parent express instance
app.set( 'stripeKeys', {} );

// Mount stripe-data module, which will use the stripeKeys from parent.
app.use( stripeData );
```