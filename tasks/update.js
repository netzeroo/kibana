module.exports = function (grunt) {
  var Promise = require('bluebird');
  var spawn = require('./utils/spawn');
  var installOrUpdateRepo = require('./utils/install_or_update_repo');

  // bower update elasticsearch && bower update K4D3 && npm run rebuild-esjs"
  grunt.registerTask('update', [
    'update-esjs',
    'update-k4d3'
  ]);

  grunt.registerTask('update-k4d3', function () {
    var k4d3Dir = grunt.config('k4d3Dir');

    installOrUpdateRepo(grunt.config('k4d3Repo'), k4d3Dir)
      .then(spawn('grunt', ['production'], k4d3Dir))
      .nodeify(this.async());
  });

  // cd ./src/bower_components/elasticsearch && npm install && grunt browser_clients:build
  grunt.registerTask('update-esjs', function () {
    var esjsDir = grunt.config('esjsDir');

    installOrUpdateRepo(grunt.config('esjsRepo'), esjsDir)
      .then(spawn('grunt', ['browser_clients:build'], esjsDir))
      .nodeify(this.async());
  });
};