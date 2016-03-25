angular.module('faye', []);

angular.module('faye').provider('Faye', function FayeProvider() {

  var FayeWrap;
  //before Angular goes off creating all services,
  //it configures and instantiates all providers.
  return {
    init: function() {
      FayeWrap = (function FayeWrap(doc) {
        var self = {
          connecting: false,
          fayeClient: null,
          fayeCallbacks: [],
          subscriptions: {},
          subscriptionCallbacks: {},
          userId: null,

          faye: function(callback) {
            if (self.fayeClient && self.connecting) {
              callback(self.fayeClient);
            } else {
              self.fayeCallbacks.push(callback);
              if (self.subscriptions.server && !self.connecting) {
                var script = doc.createElement('script');
                script.type = 'text/javascript';
                script.src = self.subscriptions.server + '/client.js';

                {//hack for ie8

                  var done = false;
                  script.onload = script.onreadystatechange = function(){
                    if(!done && (!this.readyState || this.readyState === 'loaded' || this.readyState === 'complete')){
                      done = true;
                      self.connectToFaye();
                      script.onload = script.onreadystatechange = null;
                    }
                  }

                }

                doc.documentElement.appendChild(script);
              }
            }
          },
          up: function (cb){
            var fn = function (e) {if(cb) cb();};
            if (doc.addEventListener) {
              doc.addEventListener('up', fn, false);
            }
          },
          down: function (cb){
            var fn = function (e) {if(cb) cb();};
            if (doc.addEventListener) {
              doc.addEventListener('down', fn, false);
            }
          },

          connectToFaye: function() {
            if (!Faye) {
              return;
            };

            self.fayeClient = new Faye.Client(self.subscriptions.server);

            //listen events faye up, faye down
            self.fayeClient.on('transport:down', function() {
              self.connecting = false;
              var e = doc.createEvent('Event');
              e.initEvent('down', true, true)
              doc.dispatchEvent(e);
            });
            self.fayeClient.on('transport:up', function() {
              self.connecting = true;
              var e = doc.createEvent('Event');
              e.initEvent('up', true, true)
              doc.dispatchEvent(e);
            });

            //sign to faye
            self.fayeClient.addExtension(self.fayeExtension);

            //call callbacks
            for (var i=0; i < self.fayeCallbacks.length; i++) {
              self.fayeCallbacks[i](self.fayeClient);
            };
          },

          fayeExtension: {
            outgoing: function(message, callback) {
              if (message.channel !== "/meta/subscribe") {
                return callback(message);
              }

              var subscription = self.subscriptions[self.userId];
              message.ext = message.ext || {};
              //Thus, the presence of such a token prooves the request came
              //from one of your pages.
              message.ext.timestamp = subscription.timestamp;
              message.ext.user_id = subscription.userId;
              message.ext.user_token = subscription.userToken;
              callback(message);
            },
            incoming: function(message, callback){
                 if (message.ext) delete message.ext;//delete credentials data
                 /*
                 if (message.channel === '/meta/subscribe') {
                    if (self.subscriptions[self.userId]['channel'].indexOf(message.subscription) >= 0) {
                      //if (!self.authorized(message)) message.error = '403::Authentication required';
                    }
                  }
                  */
                callback(message);
            }
          },

          sign: function(options) {
            if (!options) return;
            if (!options.channel) options.channel = [];
            if (!self.subscriptions.server) {
              self.subscriptions.server = options.server;
            }
            self.userId = options.userId;
            if (!self.subscriptions[self.userId]) {//only subscribe once to a channel
              self.subscriptions[self.userId] = options;
              self.faye(function(faye) {
                for (var channel in self.subscriptionCallbacks) {
                  faye.subscribe(channel, function(message){
                    self.handleResponse(message, channel)
                  });
                };
              });
            }
          },

          handleResponse: function(message, channel) {
            //transform callback for .subscribe method
            if (self.subscriptionCallbacks[channel]) {
              var callback = self.subscriptionCallbacks[channel]
              callback(message, channel);
            }
          },

          subscribe: function(channel, callback) {
            if (!self.subscriptions[self.userId]) return;
            self.subscriptions[self.userId]['channel'].push(channel);
            self.subscriptionCallbacks[channel] = callback;
          }
        };
        return self;
      })(document);

    },
    $get: ['$q', function ($q) {
      return FayeWrap;
    }]
 }


});
