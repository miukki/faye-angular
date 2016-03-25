# faye-angular private sub

## how to init module

```
angular.module('iamApp', [
  'faye'
])
```

```
.config(['$routeProvider', '$httpProvider', 'FayeProvider', function($routeProvider, $httpProvider, FayeProvider) {

  //Faye init
  FayeProvider.init();
```



## sample code from  project

```
.service('fayeService', ['Faye', 'Constant', '$rootScope', function(Faye, Constant, $rootScope){
  var userData;
  return {
    init: function(data){
      if (!userData) {
        userData = data;
        if (userData.user_id && Faye) {
          Faye.sign({server: Constant.faye.server, timestamp:new Date().getTime(), userToken:'', userId: userData.user_id});
          Faye.up(function(){
            console.log('faye up');
          });
          Faye.down(function(){
            console.log('faye down');
          });
          Faye.subscribe('/'+userData.user_id, function(data, channel) {
            console.log('faye', data, channel)

            if (data.code === 'EXPIRE' || data.code === 'IDLE' ) {
              $rootScope.$broadcast('idle_or_expire', angular.extend(data, {user_id: userData.user_id}));
            };

            if (data.code === 'REFRESHED') {
              $rootScope.$broadcast('close_popup', null);
            };

          });

        }
      }
    }
  }

}])



//call FayeService

fayeService.init(someUserData);
```

