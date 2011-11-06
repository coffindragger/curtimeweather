
(function($) {

    var PLUGIN = "curweather";


    function cached_get(key, url, callback) {
        var cache = JSON.parse(localStorage.getItem(key));
        if (!cache) {
            $.get(url, function(data) {
                localStorage.setItem(key, JSON.stringify(data));
                callback(data);
            });
        }
        else {
            callback(cache);
        }
    }



    function tick(data) {
        d = new Date();

        var h = d.getHours();
        if (h < 10) h = "0"+h;
        var m = d.getMinutes();
        if (m < 10) m = "0"+m;
        var s = h+":"+m;

        if (!data.latest_day || data.latest_day.day.getDate() != d.getDate()) {
            data.latest_day = {
                'day': d,
            };

            var key = "astronomy_"+data.options.ZIPCODE+d.getYear()+d.getMonth()+d.getDay();
            var url = "http://api.wunderground.com/api/"+data.options.WUNDERGROUND_KEY+"/astronomy/q/"+data.options.ZIPCODE+".json";
            cached_get(key, url, function(obj) {
                data.latest_day.sunrise = new Date();
                data.latest_day.sunrise.setHours(obj.moon_phase.sunrise.hour);
                data.latest_day.sunrise.setMinutes(obj.moon_phase.sunrise.minute);
                data.sunrise.html(data.latest_day.sunrise.getHours()+":"+data.latest_day.sunrise.getMinutes());

                data.latest_day.sunset = new Date();
                data.latest_day.sunset.setHours(obj.moon_phase.sunset.hour);
                data.latest_day.sunset.setMinutes(obj.moon_phase.sunset.minute);
                data.sunset.html(data.latest_day.sunset.getHours()+":"+data.latest_day.sunset.getMinutes());
            });
        }


        // update clock
        data.time.html(s);


        // update sun/moon
        data.sun.html('<img src="img/sun.jpg"/>')
        var rise = data.latest_day.sunrise.getTime();
        var set = data.latest_day.sunset.getTime();
        var now = d.getTime();
        var range = set - rise;
        var cur = (now - rise) / range;

        var radians = (2*Math.PI) - (cur * Math.PI) - (0.5*Math.PI);
        if (now > set) { // night time
            radians += Math.PI;  // add a half circle
            data.sun.addClass('night')
        }
        else {
            data.sun.removeClass('night')
        }

        //var cur = d.getSeconds() / 59;

        var r = 100;
        var x = 150 + Math.sin(radians) * r - 32;
        var y = 150 + Math.cos(radians) * r - 32;
        data.sun.animate({'left': x+"px", 'top': y+"px"}, 500)


        // re-tick
        setTimeout(tick, 500, data);
    }

    var methods = {
        init: function (config) {
            var options = {
                //TODO: Default Options
            }
            $.extend(options, config)
            return this.each(function() {
                var $this = $(this),
                    data = $this.data(PLUGIN);

                if (!data) {
                    data = {
                        //instance variables
                        target: $this,
                        options: options,

                        lastest_day: null,
                    };
                    $this.data(PLUGIN, data);


                    data.sun = $('<div class="sun"/>')
                    $this.append(data.sun)
                    data.moon = $('<div class="moon"/>')
                    $this.append(data.moon)
                    data.sunrise = $('<div class="sunrise"/>')
                    $this.append(data.sunrise)
                    data.time = $('<div class="time"/>')
                    $this.append(data.time)
                    data.sunset = $('<div class="sunset"/>')
                    $this.append(data.sunset)

                    tick(data);

                }
            });
        },
        destroy: function() {
            return this.each(function() {
                var $this = $(this);
                var data = $this.data(PLUGIN);

                // remove data
                $this.removeData(PLUGIN);
                //unbind namespaced events
                $(window).unbind('.'+PLUGIN);
            });
        },

        update: function(metar_string) {
            return this.each(function() {
                var $this = $(this),
                data = $this.data(PLUGIN);

                data.metar = parse_metar(metar_string)


            });
        },


    };

    $.fn[PLUGIN] = function(method) {
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        }
        else if (typeof method == 'object' || !method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error('Method '+method+'does not exist on jQuery.'+PLUGIN);
        }
    }

})(jQuery);

