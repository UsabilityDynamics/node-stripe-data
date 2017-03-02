/**
 * Maintain data with Stripe accounts.
 *
 *
 * - site.secret_token
 * - site.public_key
 * - site.id
 *
 *
 *
 *
 */
var _ = require( 'lodash');
var stripe = require( 'stripe');
var debug = require( 'debug' )('stripe-data');
var rootRequire = require( 'root-require' );
var express = require( 'express' );
var app = module.exports = express();

// Add our webhook for updates.
app.use( stripeAccess );
app.use( '/webhook/stripe-v1', stripeWebhook );

// Get settings from parent application once mounted.
app.on('mount', onceMounted );

/**
 *
 * req.clientSubscription( 'realty', 'early_adopter', 'subscription-id'  )
 *
 * @param productFamily
 * @param capability
 * @param someToken
 */
function clientSubscription( productFamily, capability, someToken ) {
  console.log( 'clientSubscription', productFamily, capability, someToken );

  var _result = _.find( module._stripeData, {
    productFamily: productFamily,
    metadata: { 'site.id': someToken },
    plan: { id: capability }
  });

  if( _result ) {
    return _result;
  }

// console.log( require( 'util' ).inspect( _result, { showHidden: false, depth: 2, colors: true } ) );

  return false;

}

function stripeAccess( req, res, next ) {

  req.clientSubscription = clientSubscription;

  next();
}

/**
 * Force data-refresh on specific webhooks.
 *
 * @param req
 * @param res
 */
function stripeWebhook( req, res ) {
  debug( 'stripeWebhook', req.url );

  res.send({
    ok: true,
    message: "Thanks for the hook, Stripe!"
  });

}

/**
 * Refresh data from Stripe.
 *
 */
function refreshStripeData( ) {
  debug( 'refreshStripeData' );

  _.each(module._stripeInstances, function eachInstance( stripeSetup ) {

    stripeSetup.instance.customers.list( { limit: 100 }, haveCustomers.bind( stripeSetup ) );

  });

}

/**
 *
 * @param parent
 */
function onceMounted( parent ) {
  debug( 'Stripe mounted. Have [%s] stripe key from parent.', parent.get( 'stripeKeys' ) );

  // set Stripe key in this middleware.
  module.package = rootRequire( 'package.json' );

  app.set( 'stripeKeys', _.get( module.package, 'config.stripeKeys' ) );

  // Expose our data to parent.
  parent.set( 'stripeData', module._stripeData );

  _.each( app.get( 'stripeKeys' ), function eachKey( stripeKey, productFamily ) {

    module._stripeInstances.push({stripeKey: stripeKey, productFamily: productFamily, instance: stripe( stripeKey ) });

  });

  setInterval( refreshStripeData, 60000 );

  refreshStripeData();

}

/**
 * Handle Customer Updates.
 *
 * @param error
 * @param customers
 */
function haveCustomers(error, customers) {
  debug( 'Have Stripe customers response.' );

  var stripeSetup = this;

  if( error ) {
    console.error( 'Unable to refreshStripeData', error );
  } else {
    debug( 'Loaded [%s] customers from Stripe.', _.get( customers, 'data', [] ).length );
  }

  if( _.get( customers, 'data' ) ) {

    // Flatten structure, add stripeKey to customer object.
    var _customers = [];

    _.each(_.get( customers, 'data' ), function( customer ) {

      _.each(_.get( customer, 'subscriptions.data' ), function eachSubscription( subscription ) {

        _customers.push( _.defaultsDeep( { id: undefined, stripeKey: stripeSetup.stripeKey, productFamily: stripeSetup.productFamily}, subscription, { metadata: customer.metadata, customerData: customer }));

      });

    });

    var customersBefore = _.filter( module._stripeData, { stripeKey: stripeSetup.stripeKey } );

    if( !customersBefore.length ) {
      debug( "Stripe customers loaded form [%s].", stripeSetup.stripeKey, module._stripeData.length  )
    } else if( _customers.length !== customersBefore.length ) {
      debug( "Stripe customer count for [%s] changed from [%s] to [%s].", stripeSetup.stripeKey, customersBefore.length, _customers.length  )
    } else {
      debug( "Total stripe customer count is at [%s].", module._stripeData.length  )
    }

    // remove all customers in list who came from this stripe key...
    _.remove( module._stripeData, { stripeKey: stripeSetup.stripeKey } );

    // re-add all new customers...
    _.each(_customers, function newCustomer( customer ) {
      module._stripeData.push( customer );
    });

  }

}

module._stripeInstances = [];

module._stripeData = [];
