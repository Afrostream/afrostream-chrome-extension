chrome.runtime.getBackgroundPageSafe = function (callback) { chrome.runtime.getBackgroundPage(function (w) { if (!w) return; callback(w); }); };

angular.module('AfrostreamApp', ['ui.bootstrap'])
  .controller('PopupController', function($scope, $http) {
    $scope.features = [];
    $scope.clients = [];

    //
    // Methods (could be in another files)
    //
    const updateFeatureStatus = function (feature) {
      // status can be :
      // default_on, default_off, custom_on, custom_off
      const val = feature.user || feature.defaultValue;
      feature.status = val +' ('+(feature.user?'CUSTOM ':'DEFAULT ')+')';
      switch (val) {
        case "0":
        case "false":
        case "off":
          feature.buttonClass = 'btn-primary';
          break;
        case "1":
        case "true":
        case "on":
          feature.buttonClass = 'btn-success';
          break;
        default:
          feature.buttonClass = 'btn-warning';
          break;
      }
    };

    // n'extrait du scope que les features modifiées par l'utilisateur
    const getUserFeatures = function (features) {
      return JSON.parse(angular.toJson(features)) // cleaned features from angular properties
        .filter(feature => feature.user !== null)
        .filter(feature => feature.defaultValue !== feature.user)
        .reduce((p, c) => { p[c.name] = c.user; return p; }, {});
    };

    const updateWebrequestHooksStatus = function (enableWebrequestHooks) {
      chrome.runtime.getBackgroundPageSafe(function (w) {
        w.enableWebRequestHooks(enableWebrequestHooks);
        // update icone pour montrer que l'on est actif !
        //dirty.features = (features.length > 0);
        //updateIco();
      });
    }

    //
    // GENERAL
    //
    $scope.enableWebrequestHooks = false;
    // load: background -> scope
    chrome.runtime.getBackgroundPageSafe(function (w) {
      $scope.enableWebrequestHooks = w.getWebRequestHooksStatus();
    });
    // change: scope -> background
    $scope.updateWebrequestHooksStatus = function (enableWebrequestHooks) {
      updateWebrequestHooksStatus(enableWebrequestHooks);
    }

    // load: localStorage -> scope
    $scope.bypassCDNCache = JSON.parse(localStorage.getItem('bypassCDNCache') || "false");
    // change: scope -> localStorage
    $scope.updateCDNCacheBypass = function (bypassCDNCache) {
      localStorage.setItem('bypassCDNCache', JSON.stringify(bypassCDNCache));
      // auto-commit des modifs
      $scope.updateScope();
      $scope.updateBackground();
    };

    // Features loading: reading from staging (should be the best env for that...)
    // load: http -> scope
    //       localstorage -> scope
    //       scope -> scope
    $http({url:'https://afr-api-v1-staging.herokuapp.com/features'})
      .then(function (response) {
        const features = response.data;
        const userFeaturesValues = JSON.parse(localStorage.getItem('features') || '{}');
        $scope.features = Object.keys(features).map(feature => {
          const result = {
            name: feature,
            defaultValue: features[feature],
            user: userFeaturesValues[feature] || null,
          };
          updateFeatureStatus(result);
          return result;
        });
        $scope.updateScope();
      });

    // change: scope -> scope & scope -> localStorage
    $scope.updateFeature = function (feature, value) {
      feature.user = value;
      updateFeatureStatus(feature);
      // backup, on ne sauvegarde que les features modifiées par l'utilisateur
      const stringifiedUserFeatures = JSON.stringify(getUserFeatures($scope.features));
      localStorage.setItem('features', stringifiedUserFeatures);
      // auto-commit des modifs
      $scope.updateScope();
      $scope.updateBackground();
    };

    // client list
    $scope.auth = {
      email: 'tech@afrostream.tv',
      envs: [
        { name: 'staging', url: 'https://afr-back-end-staging.herokuapp.com/auth/ext/token' }/*,
        { name: 'prod', url: 'https://afrostream-backend.herokuapp.com/auth/ext/token' }*/
      ],
      clients: [],
      client: null,
      env: null,
      token: null
    }
    $http({url:'https://afr-back-end-staging.herokuapp.com/api/clients/extList'})
      .then(function (response) {
        $scope.auth.clients = response.data;
      });

    //
    $scope.selectEnv = function (env) {
      $scope.auth.env = env;
    };
    $scope.selectClient = function (client) {
      $scope.auth.client = client;
    };
    $scope.generateToken = function () {
      if ($scope.auth.env && $scope.auth.client) {
        $http({url:$scope.auth.env.url, params: { clientId: $scope.auth.client._id, secret: '4hrdDRT76mrzg!.#eA45Z4sdf' }})
          .then(function (response) {
            $scope.auth.token = response.data;
          })
      }
    };

    // auto-commit: sur n'importe quel changement, scope -> backgroundPage
    $scope.updateBackground = function () {
      // force update
      $scope.enableWebrequestHooks = true;
      updateWebrequestHooksStatus($scope.enableWebrequestHooks);
      //
      chrome.runtime.getBackgroundPageSafe(function (w) {
        // cdn cache
        w.enableCDNCacheBypass(JSON.parse(localStorage.getItem('bypassCDNCache')||'false'));
        // features staging
        const featuresHeaderKey = 'Features';
        const featuresHeaderValue = JSON.stringify(getUserFeatures($scope.features));
        if (featuresHeaderValue === '{}') {
          // no features
          w.removeHeaderAFR(featuresHeaderKey);
        } else {
          w.addHeaderAFR(featuresHeaderKey, featuresHeaderValue);
        }
      });
    }

    // scope -> scope
    $scope.updateScope = function () {
      const featuresHeaderKey = 'Features';
      const featuresHeaderValue = JSON.stringify(getUserFeatures($scope.features));
      if (featuresHeaderValue === '{}') {
        $scope.headers = '';
      } else {
        $scope.headers = 'Features: '+featuresHeaderValue;
      }
    };

    $scope.updateScope();
  });
