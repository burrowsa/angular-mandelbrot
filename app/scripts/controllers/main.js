'use strict';

function sign(x) {
  if (x<0) {
    return -1;
  } else {
    return 1;
  }
}

function getBox(startX, startY, event) {
  var currentX = event.offsetX;
  var currentY = event.offsetY;
  var w = currentX - startX;
  var h = currentY - startY;
  var l = Math.max(Math.abs(w),Math.abs(h));
  w = l * sign(w);
  h = l * sign(h);
  var x_mid = (startX + currentX) / 2.0;
  var y_mid = (startY + currentY) / 2.0;
  return {x1:x_mid - l/2,
          x2:x_mid + l/2,
          y1:y_mid + l/2,
          y2:y_mid - l/2,
          w:w,
          h:h,
          l:l};
}

var RED   = [0xf1, 0xf8, 0xff, 0xcc, 0x99, 0x6a, 0x19, 0x09, 0x04, 0x00, 0x0c, 0x18, 0x39, 0x86];
var GREEN = [0xe0, 0xc9, 0xaa, 0x80, 0x57, 0x34, 0x07, 0x01, 0x04, 0x07, 0x2c, 0x52, 0x7d, 0xb5];
var BLUE  = [0xbf, 0x5f, 0x00, 0x00, 0x00, 0x03, 0x1a, 0x2f, 0x49, 0x64, 0x8a, 0xb1, 0xd1, 0xe5];

function interpolate(COLOUR, idx) {
  var f = Math.floor(idx);
  var c1 = COLOUR[(f+8) % COLOUR.length];
  var c2 = COLOUR[(f+9) % COLOUR.length];
  var tween = idx - f;
  return c1 + tween * (c2 - c1);
}

function colour(i) {
  if (i <= 0) {
    return [0, 0, 0];
  }
  var idx = Math.sqrt(i);
  return [interpolate(RED, idx), interpolate(GREEN, idx), interpolate(BLUE, idx)];
}

function createBlackImageData(canvas) {
  var ctx = canvas.getContext('2d');
  var data = ctx.createImageData(canvas.width, canvas.height);
  for (var i = 0; i < data.data.height; i += 4) {
    data.data[i] = 0;
    data.data[i+1] = 0;
    data.data[i+2] = 0;
    data.data[i+3] = 255;  // Alpha channel
  }
  return data;
}

function MandelbrotSet(canvas, x1, y1, x2, y2, width, height, dither) {
  this.x1 = x1;
  this.y1 = y1;
  this.x2 = x2;
  this.y2 = y2;
  this.width = width * dither;
  this.height = height * dither;
  this.dither = dither
  var pixels = this.width * this.height
  this.re = new Float64Array(pixels);
  this.im = new Float64Array(pixels);
  this.h_re = new Float64Array(pixels);
  this.h_im = new Float64Array(pixels);
  this.n = new Float64Array(pixels);
  this.steps = 0;
  for (var idx = 0; idx < pixels; idx++) {
    this.re[idx] = 0.0;
    this.im[idx] = 0.0;
    this.h_re[idx] = 0.0;
    this.h_im[idx] = 0.0;
    this.n[idx] = 0;
  }
  this.canvas = canvas
  this.canvas.setAttribute('width', width);
  this.canvas.setAttribute('height', height);
  this.imageData = createBlackImageData(this.canvas);
  this.unknown = this.width * this.height
}

MandelbrotSet.prototype.iterate = function(worksize) {
  // Perform at most (worksize * pixels) calculations
  var last_step = this.steps + Math.floor(worksize * this.width * this.height / this.unknown);
  var idx = 0
  for (var i = 0; i < this.width; i++) {
    var c_re = this.x1 + i * (this.x2 - this.x1) / (this.width - 1);
    for (var j = 0; j < this.width; j++) {
      if (this.n[idx] == 0) {
        var c_im = this.y2 + j * (this.y1 - this.y2) / (this.height - 1);
        var re = this.re[idx];
        var im = this.im[idx];
        var h_re = this.h_re[idx];
        var h_im = this.h_im[idx];
        for (var step = this.steps + 1; step <= last_step; step++) {
          // z = z**2 + c
          var next_re = re*re - im*im + c_re;
          var next_im = 2*re*im + c_im;
          re = next_re;
          im = next_im;

          // cycle if h == z
          if ((h_re == re) && (h_im == im)) {
            this.n[idx] = -step;  // Definitely black
            this.unknown--
            break;
          }

          // Every other step, iterate h
          if ((step % 2) == 0) {
            // h = h**2 + c
            next_re = h_re*h_re - h_im*h_im + c_re;
            next_im = 2*h_re*h_im + c_im;
            h_re = next_re;
            h_im = next_im;
          }

          // Bail out at 2**16
          var zn = re*re + im*im;
          if (zn >= 2 << 16) {

            // Normalized iteration count
            var nu = Math.log(Math.log(zn, 2) / 2, 2);
            this.n[idx] = step + 1 - nu;
            this.refreshPoint(i, j);
            this.unknown--
            break;
          }
        }
        this.re[idx] = re;
        this.im[idx] = im;
        this.h_re[idx] = h_re;
        this.h_im[idx] = h_im;
      }
      idx++;
    }
  }
  this.steps = last_step;
  if (this.unknown == 0) {
    this.steps = Number.MAX_VALUE
  }
}

MandelbrotSet.prototype.refreshPoint = function(i, j) {
  var real_i = Math.floor(i / this.dither)
  var real_j = Math.floor(j / this.dither)

  // Sum all values to be dithered together
  var r_sum = 0;
  var g_sum = 0;
  var b_sum = 0;
  var corner = (real_i * this.height + real_j) * this.dither
  for (var i_delta = 0; i_delta < this.dither * this.height; i_delta += this.height) {
    for (var j_delta = 0; j_delta < this.dither; j_delta++) {
      var p = colour(this.n[corner + i_delta + j_delta]);
      r_sum += p[0];
      g_sum += p[1];
      b_sum += p[2];
    }
  }

  // Calculate the dithered value
  var scale = this.dither * this.dither;
  var r = Math.round(r_sum / scale);
  var g = Math.round(g_sum / scale);
  var b = Math.round(b_sum / scale);

  // Write the value
  var idx = (real_j * this.height / this.dither + real_i) * 4;
  this.imageData.data[idx] = r;
  this.imageData.data[idx+1] = g;
  this.imageData.data[idx+2] = b;
  this.imageData.data[idx+3] = 255;  // opaque (alpha channel)
}

MandelbrotSet.prototype.draw = function() {
  this.canvas.getContext('2d').putImageData(this.imageData, 0, 0);
}


angular.module('angularMandelbrotApp')
  .controller('MainCtrl', function ($scope, $interval) {
  $scope.stopProcessing = function() {
    if ('drawPromise' in $scope) {
      $interval.cancel($scope.drawPromise);
      delete $scope.drawPromise;
    }
    $scope.message='';
  }

  $scope.reset = function() {
    $scope.width = 600;
    $scope.height = 600;
    $scope.step = 50
    $scope.max = 100000;
    $scope.message='';
    $scope.x1 = -2
    $scope.x2 = 0.5
    $scope.y1 = -1.25
    $scope.y2 = 1.25
    $scope.draw();
  };

  $scope.draw = function() {
    $scope.stopProcessing();
    $scope.fractal = document.getElementsByTagName('canvas')[0];
    $scope.set = new MandelbrotSet($scope.fractal, $scope.x1, $scope.y1, $scope.x2, $scope.y2, $scope.width, $scope.height, 2);
    $scope.message='Working...';
    $scope.drawPromise = $interval(function() {
      $scope.set.iterate($scope.step)
      $scope.message=$scope.set.steps + ' steps...';
      $scope.set.draw()
      if ($scope.set.steps >= $scope.max) {
        $scope.message='';
        $interval.cancel($scope.drawPromise);
        delete $scope.drawPromise
      }
    },50);
  }
  
  $scope.zoom = function(x1, y1, x2, y2) {
    var new_x1 = $scope.x1 + x1 * ($scope.x2 - $scope.x1) / ($scope.width - 1);
    var new_x2 = $scope.x1 + x2 * ($scope.x2 - $scope.x1) / ($scope.width - 1);
    var new_y1 = $scope.y2 - y1 * ($scope.y2 - $scope.y1) / ($scope.height - 1);
    var new_y2 = $scope.y2 - y2 * ($scope.y2 - $scope.y1) / ($scope.height - 1);
    $scope.x1 = new_x1
    $scope.x2 = new_x2
    $scope.y1 = new_y1
    $scope.y2 = new_y2
    
    $scope.draw();
  };
  
  if (!$scope.initialised) {
    $scope.reset();
    $scope.initialised = 1;
  } else if ($scope.initialised>1) {
    $scope.draw();
  } else {
    $scope.initialised += 1;
  }
})
  .directive('rectangledrag', function(){
  return {
    restrict: 'A',
    link: function(scope, element){
      var canvas = document.getElementsByTagName('canvas')[0];
      canvas.setAttribute('width', scope.width);
      canvas.setAttribute('height', scope.height);
      canvas.setAttribute('style', 'position:absolute');
      element[0].appendChild(canvas);
      var $canvas = element.children();
      
      var ctx = canvas.getContext('2d');
      var startX;
      var startY;
      $canvas.bind('mousedown', function(event){
        event.preventDefault();
        startX = event.offsetX;
        startY = event.offsetY;
        $canvas.bind('mousemove', mousemove);
        $canvas.bind('mouseup', mouseup);
      });
      function mousemove(event) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(startX, startY, event.offsetX - startX, event.offsetY - startY);
        ctx.strokeStyle ='rgba(255,255,255,0.5)';
        ctx.strokeRect(startX, startY, event.offsetX - startX, event.offsetY - startY);
      }
      function mouseup(event) {
        $canvas.unbind('mousemove', mousemove);
        $canvas.unbind('mouseup', mouseup);

        var box = getBox(startX, startY, event);
        
        if (box.l>10) {
          scope.zoom(box.x1, box.y1, box.x2, box.y2);
        }
      }
    }
  };
});
