
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
    function cached_post(key, url, url_data, callback) {
        var cache = JSON.parse(localStorage.getItem(key));
        if (!cache) {
            $.post(url, url_data, function(data) {
                localStorage.setItem(key, JSON.stringify(data));
                callback(data);
            });
        }
        else {
            callback(cache);
        }
    }


    function format_time(d)
    {
        var h = d.getHours();
        if (h < 10) h = "0"+h;
        var m = d.getMinutes();
        if (m < 10) m = "0"+m;
        return h+":"+m;
    }

    function tick(data) {
        d = new Date();

        
        // update clock
        data.time.html(format_time(d));

        if (!data.latest_day || data.latest_day.day.getDate() != d.getDate()) {
            data.latest_day = {
                'day': d,
            };



            /* wunderground moon phase*/
            var key = "astronomy_"+data.options.ZIPCODE+d.getYear()+d.getMonth()+d.getDay();
            var url = "http://api.wunderground.com/api/"+data.options.WUNDERGROUND_KEY+"/astronomy/q/"+data.options.ZIPCODE+".json";
            cached_get(key, url, function(obj) {
                data.latest_day.moon_illum = obj.moon_phase.percentIlluminated
                data.latest_day.moon_age = obj.moon_phase.ageOfMoon

                var wax_or_wane = 'wax'
                if (data.latest_day.moon_age >= 15) {
                    wax_or_wane = 'wane'
                }

                data.moon.html('<img src="img/moonvis/moon_'+wax_or_wane+'_'+data.latest_day.moon_illum+'.jpg"/>')
            });


            // us navy {sun,moon}{rise,set} times
            var key = "usno.navy.mil_"+data.options.ZIPCODE+d.getYear()+d.getMonth()+d.getDay();
            var url = "http://aa.usno.navy.mil/cgi-bin/aa_pap.pl"
            var url_data = {
                'FFX': 1,
                'ID': 'CSKY',
                'xxy': d.getFullYear(),
                'xxm': d.getMonth()+1,
                'xxd': d.getDate(),
                'st': 'OR',
                'place': 'eugene',
                'ZZZ': 'END',
            };
            cached_post(key, url, url_data, function(response) {

                var ampm2date = function(s) {
                    var d = new Date()
                    var parts = s.split(/[: ]/)
                    var h = parts[0]
                    var m = parts[1]
                    if (parts[2].match(/p.m./)) {
                        h = 12+Number(h);
                    }
                    d.setHours(h);
                    d.setMinutes(m);
                    return d;

                }

                //var $pre = $(response);//.find('pre');
                var resp = String(response);

                //var re = new RegExp("", 'i')
                if ((matches = resp.match(/Sunrise\s+(\d+:\d+ [ap]\.m\.)/)))
                    data.latest_day.sunrise = ampm2date(matches[1])
                if ((matches = resp.match(/Sunset\s+(\d+:\d+ [ap]\.m\.)/)))
                    data.latest_day.sunset = ampm2date(matches[1])
                if ((matches = resp.match(/Moonrise\s+(\d+:\d+ [ap]\.m\.)  /)))
                    data.latest_day.moonrise = ampm2date(matches[1])
                if ((matches = resp.match(/Moonset\s+(\d+:\d+ [ap]\.m\.) on following day/)))
                    data.latest_day.moonset = new Date(ampm2date(matches[1]).getTime() + 86400000);

                data.sunrise.html(format_time(data.latest_day.sunrise))
                data.sunset.html(format_time(data.latest_day.sunset))
                data.moonrise.html(format_time(data.latest_day.moonrise))
                data.moonset.html(format_time(data.latest_day.moonset))

            });

        }




        function animate_rising_setting(origin_x, origin_y, radius, target, rise, set)
        {
            var now = new Date().getTime();
            var range = set - rise;
            var cur = (now - rise) / range;
            var radians = (2*Math.PI) - (cur * Math.PI) - (0.5*Math.PI);
            if (now > set) { // night time
                target.addClass('night')
            }
            else {
                target.removeClass('night')
            }

            var x = Math.round(origin_x + Math.sin(radians) * radius - 32);
            var y = Math.round(origin_y + Math.cos(radians) * radius - 32);
            if (x != target.x || y != target.y) {
                target.animate({'left': x+"px", 'top': y+"px"}, 500)
            }
        }
        animate_rising_setting(150, 150, 100, data.sun, data.latest_day.sunrise.getTime(), data.latest_day.sunset.getTime());
        animate_rising_setting(150, 150, 100, data.moon, data.latest_day.moonrise.getTime(), data.latest_day.moonset.getTime());


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



                    var $container = $('<section>  <div class="sun"><img src="img/sun.jpg"/></div>  <div class="moon"></div> <div class="cloudcover"/> <div class="current"><div class="temperature"/><div class="time"/><div class="dewpoint"/><div class="conditions"/></div>  <div class="rise"><div class="sunrise"/><div class="moonrise"/></div><div class="set"><div class="sunset"/><div class="moonset"/></div> </section>')
                    $this.append($container)

                    data.sun = $container.find('.sun')
                    data.moon = $container.find('.moon')
                    data.sunrise = $container.find('.sunrise')
                    data.sunset = $container.find('.sunset')
                    data.moonrise = $container.find('.moonrise')
                    data.moonset = $container.find('.moonset')
                    data.temperature = $container.find('.temperature')
                    data.time = $container.find('.time')
                    data.dewpoint = $container.find('.dewpoint')
                    data.conditions = $container.find('.conditions')
                    data.cloudcover = $container.find('.cloudcover')


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
                console.log(data.metar)


                data.temperature.html(Math.round(data.metar.temp_f)+" &deg;F")
                data.dewpoint.html(Math.round(data.metar.dewpoint_f)+" &deg;F")

                data.cloudcover.html('');
                for (var i=0; i < data.metar.clouds.length; i++) {
                    var cloud = data.metar.clouds[i];
                    var cover = cloud[0].toLowerCase();
                    var altitude = cloud[1];
                    data.cloudcover.prepend('<img class="'+cover+'" src="img/cloudcover/'+cover+'.png"/>');
                }


                data.conditions.html( data.metar.weather.join('<br/>') );



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

