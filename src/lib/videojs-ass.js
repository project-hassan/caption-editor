/*! videojs-ass
 * Copyright (c) 2014 Sunny Li
 * Licensed under the Apache-2.0 license. */

export default new Promise((resolve, reject) => {
  'use strict';

  var vjs_ass = function (options) {
    var overlay = document.createElement('div'),
      clock = null,
      clockRate = options.rate || 1,
      delay = options.delay || 0,
      player = this,
      renderer = null,
      AssButton = null,
      AssButtonInstance = null,
      OverlayComponent = null,
      VjsButton = null;

    if (!options.src) {
      return;
    }

    overlay.className = 'vjs-ass';

    OverlayComponent = {
      name: function () {
        return 'AssOverlay';
      },
      el: function () {
        return overlay;
      }
    }

    player.addChild(OverlayComponent);

    function getCurrentTime() {
      return player.currentTime() - delay;
    }

    clock = new libjass.renderers.AutoClock(getCurrentTime, 500);

    player.on('play', function () {
      clock.play();
    });

    player.on('pause', function () {
      clock.pause();
    });

    player.on('seeking', function () {
      clock.seeking();
    });

    function updateClockRate() {
      clock.setRate(player.playbackRate() * clockRate);
    }

    updateClockRate();
    player.on('ratechange', updateClockRate);

    function updateDisplayArea() {
      //setTimeout(function () {
        // player might not have information on video dimensions when using external providers
        var videoWidth = options.videoWidth || player.videoWidth() || player.el().offsetWidth,
          videoHeight = options.videoHeight || player.videoHeight() || player.el().offsetHeight,
          videoOffsetWidth = player.el().offsetWidth,
          videoOffsetHeight = player.el().offsetHeight,

          ratio = Math.min(videoOffsetWidth / videoWidth, videoOffsetHeight / videoHeight),
          subsWrapperWidth = videoWidth * ratio,
          subsWrapperHeight = videoHeight * ratio,
          subsWrapperLeft = (videoOffsetWidth - subsWrapperWidth) / 2,
          subsWrapperTop = (videoOffsetHeight - subsWrapperHeight) / 2;

        renderer.resize(subsWrapperWidth, subsWrapperHeight, subsWrapperLeft, subsWrapperTop);
      //}, 100);
    }

    window.addEventListener('resize', updateDisplayArea);
    player.on('loadedmetadata', updateDisplayArea);
    player.on('resize', updateDisplayArea);
    player.on('fullscreenchange', updateDisplayArea);

    player.on('dispose', function () {
      clock.disable();
      window.removeEventListener('resize', updateDisplayArea);
    });

    libjass.ASS.fromUrl(options.src, libjass.Format.ASS).then(
      function (ass) {
        var rendererSettings = new libjass.renderers.RendererSettings();
        if (options.hasOwnProperty('enableSvg')) {
          rendererSettings.enableSvg = options.enableSvg;
        }
        if (options.hasOwnProperty('fontMap')) {
          rendererSettings.fontMap = new libjass.Map(options.fontMap);
        } else if (options.hasOwnProperty('fontMapById')) {
          rendererSettings.fontMap = libjass.renderers.RendererSettings
            .makeFontMapFromStyleElement(document.getElementById(options.fontMapById));
        }

        renderer = new libjass.renderers.WebRenderer(ass, clock, overlay, rendererSettings);
        // re-render forced
        renderer._resize = updateDisplayArea
        resolve(renderer)
      }
    );

    // Visibility Toggle Button
    if (!options.hasOwnProperty('button') || options.button) {
      VjsButton = videojs.getComponent('Button');
      AssButton = videojs.extend(VjsButton, {
        constructor: function (player, options) {
          options.name = options.name || 'assToggleButton';
          VjsButton.call(this, player, options);
        },
        buildCSSClass: function () {
          var classes = VjsButton.prototype.buildCSSClass.call(this);
          return 'vjs-ass-button ' + classes;
        },
        handleClick: function () {
          if (!this.hasClass('inactive')) {
            this.addClass('inactive');
            overlay.style.display = "none";
          } else {
            this.removeClass('inactive');
            overlay.style.display = "";
          }
        }
      });

      player.ready(function () {
        AssButtonInstance = new AssButton(player, options);
        player.controlBar.addChild(AssButtonInstance);
        player.controlBar.el().insertBefore(
          AssButtonInstance.el(),
          player.controlBar.getChild('customControlSpacer').el().nextSibling
        );
      });
    }
  };

  videojs.plugin('ass', vjs_ass);
})
