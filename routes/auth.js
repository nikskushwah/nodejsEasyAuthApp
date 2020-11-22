var graph = require('../graph');

var router = require('express-promise-router')();
var access_token = null;

const axios = require('axios');

/* GET auth callback. */
router.get('/signin',
  async function (req, res) {
    const urlParameters = {
      scopes: process.env.OAUTH_SCOPES.split(','),
      redirectUri: process.env.OAUTH_REDIRECT_URI
    };

    try {
      const authUrl = await req.app.locals
        .msalClient.getAuthCodeUrl(urlParameters);
      res.redirect(authUrl);
    }
    catch (error) {
      console.log(`Error: ${error}`);
      req.flash('error_msg', {
        message: 'Error getting auth URL',
        debug: JSON.stringify(error, Object.getOwnPropertyNames(error))
      });
      res.redirect('/');
    }
  }
);

router.get('/callback',
  async function(req, res) {
    const tokenRequest = {
      code: req.query.code,
      scopes: process.env.OAUTH_SCOPES.split(','),
      redirectUri: process.env.OAUTH_REDIRECT_URI
    };

    try {
      const response = await req.app.locals
        .msalClient.acquireTokenByCode(tokenRequest);

      // Save the user's homeAccountId in their session
      req.session.userId = response.account.homeAccountId;

	  access_token = response.accessToken;

      const user = await graph.getUserDetails(response.accessToken);

      // Add the user to user storage
      req.app.locals.users[req.session.userId] = {
        displayName: user.displayName,
        email: user.mail || user.userPrincipalName,
        timeZone: user.mailboxSettings.timeZone
      };
    } catch(error) {
      req.flash('error_msg', {
        message: 'Error completing authentication',
        debug: JSON.stringify(error, Object.getOwnPropertyNames(error))
      });
    }

	console.log('calling the test api.');
	console.log('access token ==> ' + access_token);
	axios({
			method:"POST",
			url : "https://devngpaadauthwebapp.azurewebsites.net/plc/test",
			headers: {
				"content-type":"application/json",
				//"Ocp-Apim-Subscription-Key":"7b77159fb4624fefbfe9a03df0481d65",
				"Authorization": "Bearer " + access_token
			},
			data: [{"buyerInvoiceId":"","buyerPOId":"PO-101-101","buyerInvoiceNumber":"Inv-1112","buyerInvoiceDate":"10132020","buyerEmail":"lokesh.ahuja@gmail.com","buyerPONumber":"PO2020-1","buyerPODate":"10142020","buyerName":"ongc","buyerSalesOrderNumber":"10132020-101","buyerSalesOrderNumberDate":"10132020","productInfo":{"productId":"1","productSerialNumber":"Serial13H","productBatchNumber":"","productQuantity":"22","productDescription":"2233","productLot":"","productType":"","productSpecification":[{"fieldType":"Material","fieldName":"Steel","fieldValue":"Strong"},{"fieldType":"Size","fieldName":"Length","fieldValue":"33"},{"fieldType":"Size","fieldName":"Length","fieldValue":"33"},{"fieldType":"Size","fieldName":"Length","fieldValue":"33"}],"additionalProperties":[{"fieldName":"productLength","fieldValue":"2 inch"},{"fieldName":"productWidth","fieldValue":"4 metre"}]},"entityId":"devngp","type":"endCustomerInvoice","createdBy":"Rakesh","createdDate":"10132020","updatedDate":"","updatedBy":""}]
		})
		.then(function (response) {
			console.log('successfully called the test api.');
			console.log(response);
			console.log(response.data);
		  })
		.catch(err=> {
			console.log(err);
		});
		
	console.log('no redirect.');
    //res.redirect('/');
  }
);
router.get('/signout',
  async function(req, res) {
    // Sign out
    if (req.session.userId) {
      // Look up the user's account in the cache
      const accounts = await req.app.locals.msalClient
        .getTokenCache()
        .getAllAccounts();

      const userAccount = accounts.find(a => a.homeAccountId === req.session.userId);

      // Remove the account
      if (userAccount) {
        req.app.locals.msalClient
          .getTokenCache()
          .removeAccount(userAccount);
      }
    }

    // Destroy the user's session
    req.session.destroy(function (err) {
      res.redirect('/');
    });
  }
);

module.exports = router;