const async = require('async');
const getJson = require('./getJson');
const getNgJson = require('./getAngularJson');
const join = require('path').join;
const merge = require('lodash.merge');
const pickby = require('lodash.pickby');

var getJsonsFromDirectories = function (dirs, cb) {
  async.map(dirs, getJson, cb);
};

var getNgJsonsFromDirectories = function (dirs, cb) {
  async.map(dirs, getNgJson, cb);
};

function getNgCliDependencies(dirs, graph, cb) {

  getNgJsonsFromDirectories(dirs, (err, datas) => {
    if (err) {
      return cb(err);
    }

    const ngOutputPaths = {};
    const ngDirs = [];
    datas.filter(data => null !== data)
      .forEach(data => {
        if ('object' === typeof data.data.projects) {
          const projectIds = Object.keys(data.data.projects);
          ngDirs.push(...projectIds.map(projectId => {
            const project = data.data.projects[projectId];
            const path = join(data.path, project.root);
            const outputPath = join(data.path, 'dist', projectId);

            ngOutputPaths[path] = outputPath;

            return path;
          }));
        }
      });

    async.map(ngDirs, getJson, (err, datas) => {
      if (err) {
        return cb(err);
      }

      const names = datas.filter(data => null !== data)
        .map(data => data.data.name);

      var dependencies = datas.filter(data => null !== data)
        .map((data) => {
        
          let dependencies = pickby(data.data.dependencies, (value, key) => {
            return names.indexOf(key) > -1;
          });
          
          let devDependencies = pickby(data.data.devDependencies, (value, key) => {
            return names.indexOf(key) > -1;
          });
    
          const deps = merge(dependencies, devDependencies);
    
          return {
            name: data.data.name,
            path: ngOutputPaths[data.path] || data.path,
            linkContent: true,
            deps: deps,
            size: Object.keys(deps).length
          }
        });
  
      dependencies.sort((a, b) => {
        return a.size - b.size;
      })
  
      var ngGraph = dependencies.reduce((a, b) => {
        a[b.name] = b;
        return a;
      }, {})
  
      return cb(null, {...graph, ...ngGraph});
    })
  });
    
}

module.exports = function (dirs, cb) {
  var deps = {}         // { module name -> [jsonDeps++jsonDevDeps] }
    , absPaths = {};    // { module name -> abs module path }

  getJsonsFromDirectories(dirs, function (err, datas) {
    if (err) {
      return cb(err);
    }

    const names = datas.map(data => data.data.name);

    var dependencies = datas.map((data) => {
      
      let dependencies = pickby(data.data.dependencies, (value, key) => {
        return names.indexOf(key) > -1;
      });
      
      let devDependencies = pickby(data.data.devDependencies, (value, key) => {
        return names.indexOf(key) > -1;
      });

      const deps = merge(dependencies, devDependencies);

      return {
        name: data.data.name,
        path: data.path,
        linkContent: false,
        deps: deps,
        size: Object.keys(deps).length
      }

    });

    dependencies.sort((a, b) => {
      return a.size - b.size;
    })

    var graph = dependencies.reduce((a, b) => {
      a[b.name] = b;
      return a;
    }, {})

    return getNgCliDependencies(dirs, graph, cb);
  });
};
