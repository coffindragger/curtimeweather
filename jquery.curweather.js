
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

            var key = "history_"+data.options.ZIPCODE+d.getYear()+d.getMonth()+d.getDay()+d.getHours();
            var url = "http://api.wunderground.com/api/"+data.options.WUNDERGROUND_KEY+"/history/q/"+data.options.ZIPCODE+".json";
            cached_get(key, url, function(obj) {
                for (var i=0; i<obj.history.observations.length; i++) {
                    var observation = obj.history.observations[i];

                    if (!(observation.metar in data.metar_history)) {
                        data.metar_history[observation.metar] = true;
                        data.target.curweather('update', observation.metar);
                    }

                }
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
                        metar_history: {},
                    };
                    $this.data(PLUGIN, data);


                    data.sun = $this.find('.sun')
                    data.moon = $this.find('.moon')
                    data.sunrise = $this.find('.sunrise')
                    data.sunset = $this.find('.sunset')
                    data.moonrise = $this.find('.moonrise')
                    data.moonset = $this.find('.moonset')
                    data.temperature = $this.find('.temperature')
                    data.time = $this.find('.time')
                    data.dewpoint = $this.find('.dewpoint')
                    data.pressure = $this.find('.pressure')
                    data.conditions = $this.find('.conditions')
                    data.cloudcover = $this.find('.cloudcover')


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

                data.temperature.html(Math.round(data.metar.temp_f))
                data.dewpoint.html(Math.round(data.metar.dewpoint_f))
                data.pressure.html(data.metar.pressure_in)

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


    function parse_metar(metar_string) {
        var metar = {
            clouds: [],
            weather: [],
        }

        var parts = metar_string.split(/\s+/)
        metar.type = parts.shift(); // METAR or SPECI
        metar.loc = parts.shift(); // K***
        for (var i=0; i < parts.length; i++) {
            var chunk = parts[i];

            if (chunk.match(/Z$/)) {
                // timestamp
                metar.observe_date = new Date();
                metar.observe_date.setUTCDate(chunk.slice(0,2))
                metar.observe_date.setUTCHours(chunk.slice(2,4))
                metar.observe_date.setUTCMinutes(chunk.slice(4,6))
                metar.observed_at = metar.observe_date.toString()
            }
            else
            if (chunk.match(/KT$/)) {
                // wind direction and speed
                metar.wind_dir = Number(chunk.slice(0,3))
                metar.wind_spd = Number(chunk.slice(3,5))
                if (chunk[5] == 'G') {
                    metar.wind_gusts = Number(chunk.slice(5).replace(/KT$/,''))
                }
            }
            else
            if ((matches = chunk.match(/(\d+)(\/(\d+))?SM$/))) {
                //visibility
                if (matches[2]) {
                    metar.visibility_mi = Number(matches[1]) / Number(matches[3]);
                }
                else {
                    metar.visibility_mi = 1;
                }
            }
            else
            if (chunk.match(/^OVC/) || chunk.match(/^BKN/) || chunk.match(/^SCT/) || chunk.match(/^FEW/) || chunk.match(/^SKC/)) {
                //cloud coverage
                metar.clouds.push( [chunk.slice(0,3), Number(chunk.slice(3,6))*100] )
            }
            else
            if ((matches = chunk.match(/(M?)(\d+)\/(M?)(\d+)/))) {
                // TEMP/DEW
                metar.temp_c = Number(matches[2])
                if (matches[1] == 'M') {
                    metar.temp_c *= -1;
                }
                metar.dewpoint_c = Number(matches[4])
                if (matches[3] == 'M') {
                    metar.dewpoint_c *= -1;
                }
            }
            else
            if (chunk.match(/^T/)) {
                // RMK T* temperature/dewpoint
                metar.temp_c = Number(chunk.slice(2,5))/10
                if (chunk[1] == '1') {
                    metar.temp_c *= -1;
                }
                metar.dewpoint_c = Number(chunk.slice(6,9))/10
                if (chunk[5] == '1') {
                    metar.dewpoint_c *= -1;
                }
            }
            else
            if (chunk.match(/^AO2/)) {
            }
            else
            if (chunk.match(/^A/)) {
                // altimeter pressure
                metar.pressure_in = Number(chunk.slice(1))/100;
            }
            else
            if (chunk.match(/^SLP/)) {
                // RMK SLP* sea level pressure
                metar.pressure_sea = Number("10"+chunk.slice(3))/10;
            }
            else
            if ((matches = chunk.match(/([-+]?)(VC)?(BC|BL|DR|FZ|MI|PR|SH|TS)?(DZ|GR|GS|IC|PL|RA|SG|SN|UP)?(BR|DU|FG|FU|HZ|PY|SA|VA)?(DS|FC|PO|SQ|SS)?/))) {
                var abbr = {
                    'BC': "Patchy",
                    'BL': "Blowing",
                    'DR': "Low Drifting",
                    'FZ': "Freezing",
                    'MI': "Shallow",
                    'PR': "Partial",
                    'SH': "Shower",
                    'TS': "Thunderstorm",
                    'DZ': "Drizzle",
                    'GR': "Hail",
                    'GS': "Hail+Snow",
                    'IC': "Ice Crystals",
                    'PL': "Ice Pellets",
                    'RA': "Rain",
                    'SG': "Snow Grains",
                    'SN': "Snow",
                    'BR': "Mist",
                    'DU': "Widespread Dust",
                    'FG': "Fog",
                    'FU': "Smoke",
                    'HZ': "Haze",
                    'PY': "Spray",
                    'SA': "Sand",
                    'VA': "Volcanic Ash",
                    'DS': "Dust Storm",
                    'FC': "Funnel Cloud",
                    'PO': "Dust/Sand Whirls",
                    'SQ': "Squalls",
                    'SS': "Sandstorm",
                };

                var out = []
                if (matches[1] == '-') 
                    out.push('Light')
                else
                if (matches[1] == '+')
                    out.push('Heavy')

                out.push(abbr[matches[3]])
                out.push(abbr[matches[4]])
                out.push(abbr[matches[5]])

                if (matches[2] == 'VC') 
                    out.push("In Vicinity")

                var s = out.join(" ").replace(/\s+/, ' ').trim()
                if (s) {
                    metar.weather.push(s)
                }
            }

        }

        metar.clouds.sort(function (a,b) {
            return a[1] - b[1];
        })
        metar.temp_f = metar.temp_c * (9/5) + 32;
        metar.dewpoint_f = metar.dewpoint_c * (9/5) + 32;

        return metar;
    }


})(jQuery);

