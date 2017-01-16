chrome.runtime.getBackgroundPageSafe = function (callback) { chrome.runtime.getBackgroundPage(function (w) { if (!w) return; callback(w); }); };

angular.module('AfrostreamApp', ['ui.bootstrap'])
  .controller('PopupController', function($scope, $http) {
    $scope.staging = {
      features: { }
    };
    $scope.prod = {
      features: { }
    };

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

    // on charge les features depuis l'api, et ce qu'a config l'user depuis son cache.
    $http({url:'https://afr-api-v1-staging.herokuapp.com/features'})
      .then(function (response) {
        const features = response.data;
        const userFeaturesValues = JSON.parse(localStorage.getItem('staging.features') || '{}');
        $scope.staging.features = Object.keys(features).map(feature => {
          const result = {
            name: feature,
            defaultValue: features[feature],
            user: userFeaturesValues[feature] || null,
          };
          updateFeatureStatus(result);
          return result;
        });
        // on resauvegarde immediatement ce resultat dans le cache, pour être certain
        // que la background soit a jour des features présentes
        $scope.stagingFeaturesChanged();
      });

    $scope.updateFeatureUserValue = function (feature, value) {
      feature.user = value;
      updateFeatureStatus(feature);
      $scope.stagingFeaturesChanged();
    };

    // des que l'utilisateur change , on sauvegarde dans son cache & on update le background.
    $scope.stagingFeaturesChanged = function () {
      // backup, on ne sauvegarde que les features non default.
      const json = angular.toJson($scope.staging.features);
      const features = JSON.parse(json); // cleaned features from angular properties
      const nonDefaultFeatures = features.filter(feature => feature.defaultValue !== feature.user)
        .reduce((p, c) => { p[c.name] = c.user; return p; }, {});
      console.log('saving user features ', nonDefaultFeatures);
      const stringifiedUserFeatures = JSON.stringify(nonDefaultFeatures);
      localStorage.setItem('staging.features', stringifiedUserFeatures);
      chrome.runtime.getBackgroundPageSafe(function (w) {
        var featuresHeaderKey = 'Features';
        var featuresHeaderValue = stringifiedUserFeatures;
        w.addHeaderStaging(featuresHeaderKey, featuresHeaderValue);
        // update icone
        //dirty.features = (features.length > 0);
        //updateIco();
      });

    }
  });
