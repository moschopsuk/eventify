var gulp = require('gulp'),
    gutil = require('gulp-util'),
    gulpif = require('gulp-if'),
    rename = require('gulp-rename'),
    streamify = require('gulp-streamify'),
    autoprefixer = require('gulp-autoprefixer'),
    cssmin = require('gulp-cssmin'),
    sass = require('gulp-sass'),
    concat = require('gulp-concat'),
    plumber = require('gulp-plumber'),
    source = require('vinyl-source-stream'),
    glob = require('glob'),
    es = require('event-stream'),
    babelify = require('babelify'),
    browserify = require('browserify'),
    watchify = require('watchify'),
    uglify = require('gulp-uglify'),
    mocha   = require('gulp-mocha');

var production = process.env.NODE_ENV === 'production';

var dependencies = [
  'alt',
  'react',
  'react-dom',
  'react-router',
  'underscore'
];


var config = {
    bowerDir: './bower_components'
};

/*
 |--------------------------------------------------------------------------
 | Combine all JS libraries into a single file for fewer HTTP requests.
 |--------------------------------------------------------------------------
 */

gulp.task('vendor', function() {
  return gulp.src([
    config.bowerDir + '/jquery/dist/jquery.js',
    config.bowerDir + '/js-cookie/src/js.cookie.js',
    config.bowerDir + '/bootstrap-sass/assets/javascripts/bootstrap.js',
    'assets/js/dashboard.js',
  ]).pipe(concat('vendor.js'))
    .pipe(gulpif(production, uglify({ mangle: false })))
    .pipe(gulp.dest('public/js'));
});

/*
 |--------------------------------------------------------------------------
 | Compile only project files, excluding all third-party dependencies.
 |--------------------------------------------------------------------------
 */
gulp.task('browserify', function(done) {
     glob('./assets/react/**/app-*.jsx', function(err, files) {
        if(err) done(err);
        var tasks = files.map(function(entry) {
            return browserify({ entries: [entry] })
                .transform(babelify)
                .bundle()
                .on('end', function() {
                    gutil.log(gutil.colors.blue('Bundled:', entry));
                })
                .pipe(source(entry))
                .pipe(rename({
                    dirname: "/",
                    extname: '.bundle.js'
                }))
                .pipe(gulpif(production, uglify({ mangle: false })))
                .pipe(gulp.dest('./public/js/'));
            });
        es.merge(tasks).on('end', done);
    });
});

/*
 |--------------------------------------------------------------------------
 | Same as browserify task, but will also watch for changes and re-compile.
 |--------------------------------------------------------------------------
 */
gulp.task('browserify-watch', function() {
    glob('./assets/react/**/app-*.jsx', function(err, files) {
        if(err) done(err);
        var tasks = files.map(function(entry) {
             var bundler = watchify(browserify({ entries: [entry] }, watchify.args));
             bundler.transform(babelify);
             bundler.on('update', rebundle);

             function rebundle() {
                var start = Date.now();
                return bundler.bundle()
                .on('error', function(err) {
                    gutil.log(gutil.colors.red(err.toString()));
                })
                .on('end', function() {
                    gutil.log(gutil.colors.blue('Bundled:', entry));
                    gutil.log(gutil.colors.green('Finished rebundling in', (Date.now() - start) + 'ms.'));
                })
                .pipe(source(entry))
                .pipe(rename({
                    dirname: "/",
                    extname: '.bundle.js'
                }));
             }

            return rebundle();
        });
    });
});
/*
  var bundler = watchify(browserify('app/main.js', watchify.args));
  bundler.external(dependencies);
  bundler.transform(babelify);
  bundler.on('update', rebundle);
  return rebundle();

  function rebundle() {
    var start = Date.now();
    return bundler.bundle()
      .on('error', function(err) {
        gutil.log(gutil.colors.red(err.toString()));
      })
      .on('end', function() {
        gutil.log(gutil.colors.green('Finished rebundling in', (Date.now() - start) + 'ms.'));
      })
      .pipe(source('bundle.js'))
      .pipe(gulp.dest('public/js/'));
  }
});*/

/*
 |--------------------------------------------------------------------------
 | Font awesome icons
 |--------------------------------------------------------------------------
 */
gulp.task('icons', function() {
    return gulp.src(config.bowerDir + '/font-awesome/fonts/**.*')
        .pipe(gulp.dest('./public/fonts'));
});

/*
 |--------------------------------------------------------------------------
 | Fonts
 |--------------------------------------------------------------------------
 */

 gulp.task('fonts', ['admin-fonts'], function() {
    return gulp.src(config.bowerDir + '/bootstrap-sass/assets/fonts/*/**')
        .pipe(gulp.dest('./public/fonts'));
});

 gulp.task('admin-fonts', function() {
    return gulp.src(config.bowerDir + '/rdash-ui/dist/fonts/**.*')
        .pipe(gulp.dest('./public/fonts'));
 });

/*
 |--------------------------------------------------------------------------
 | Compile SASS stylesheets.
 |--------------------------------------------------------------------------
 */
gulp.task('styles', function() {
  return gulp.src(['assets/styles/app.scss', 'assets/styles/admin.scss'])
    .pipe(plumber())
    .pipe(sass({
        includePaths: [
            config.bowerDir
        ]
    }))
    .pipe(autoprefixer())
    .pipe(gulpif(production, cssmin()))
    .pipe(gulp.dest('public/css'));
});

gulp.task('watch', function() {
  gulp.watch(['assets/styles/*.scss', 'assets/styles/**/*.scss'], ['styles']);
});


/*
 |--------------------------------------------------------------------------
 | Tests
 |--------------------------------------------------------------------------
 */
 gulp.task('test', function () {
    return gulp.src('tests/model/*-spec.js', {read: false})
        .pipe(mocha({reporter: 'spec'}));
 });


gulp.task('default', ['styles', 'icons', 'fonts', 'vendor', 'browserify-watch', 'watch']);
gulp.task('build', ['styles', 'icons', 'fonts', 'vendor', 'browserify']);
