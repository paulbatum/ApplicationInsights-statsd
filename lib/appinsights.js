"use strict";
console.log("[aibackend] Starting...");
var util = require("util");
var ai = require("applicationinsights");
var AppInsightsBackend = (function () {
    function AppInsightsBackend(config) {
        this.trackStatsDMetrics = false;
        this.roleName = config.aiRoleName;
        this.roleInstance = config.aiRoleInstance;
        this.instrumentationKey = config.aiInstrumentationKey;
        if (!!config.aiPrefix) {
            this.prefix = config.aiPrefix + ".";
        }
        if (!!config.aiTrackStatsDMetrics) {
            this.trackStatsDMetrics = config.aiTrackStatsDMetrics;
        }
    }
    Object.defineProperty(AppInsightsBackend.prototype, "aiClient", {
        get: function () {
            return this.appInsights.client;
        },
        enumerable: true,
        configurable: true
    });
    AppInsightsBackend.prototype.init = function (events) {
        console.log("[aibackend] Initializing");
        this.appInsights = ai.setup(this.instrumentationKey);
        if (this.roleName) {
            this.aiClient.context.tags[this.aiClient.context.keys.deviceRoleName] = this.roleName;
        }
        if (this.roleInstance) {
            this.aiClient.context.tags[this.aiClient.context.keys.deviceRoleInstance] = this.roleInstance;
        }
        console.log("[aibackend] Registering for 'flush' event");
        events.on("flush", this.onFlush.bind(this));
    };
    AppInsightsBackend.prototype.onFlush = function (timestamp, metrics) {
        console.log("[aibackend] OnFlush called");
        var countersTracked = 0;
        for (var counterKey in metrics.counters) {
            if (!this.shouldProcess(counterKey)) {
                continue;
            }
            var parsedCounterKey = this.parseKey(counterKey);
            var counter = metrics.counters[counterKey];
            this.aiClient.trackMetric(parsedCounterKey.metricname, counter, null, null, null, null, parsedCounterKey.properties);
            countersTracked++;
        }
        ;
        console.log("[aibackend] %d counters tracked", countersTracked);
        var timerDataTracked = 0;
        for (var timerKey in metrics.timer_data) {
            if (!this.shouldProcess(timerKey)) {
                continue;
            }
            var parsedTimerKey = this.parseKey(timerKey);
            var timer = metrics.timer_data[timerKey];
            this.aiClient.trackMetric(parsedTimerKey.metricname, timer.sum, timer.count, timer.lower, timer.upper, timer.std, parsedTimerKey.properties);
            timerDataTracked++;
        }
        ;
        console.log("[aibackend] %d timer data tracked", timerDataTracked);
        var gaugesTracked = 0;
        for (var gaugeKey in metrics.gauges) {
            if (!this.shouldProcess(gaugeKey)) {
                continue;
            }
            var parsedGaugeKey = this.parseKey(gaugeKey);
            var gauge = metrics.gauges[gaugeKey];
            this.aiClient.trackMetric(parsedGaugeKey.metricname, gauge, null, null, null, null, parsedGaugeKey.properties);
            gaugesTracked++;
        }
        ;
        console.log("[aibackend] %d gauges tracked", gaugesTracked);
        console.log("[aibackend] OnFlush completed");
        return true;
    };
    AppInsightsBackend.prototype.shouldProcess = function (key) {
        if (!this.trackStatsDMetrics && key.indexOf("statsd.") === 0) {
            return false;
        }
        if (this.prefix !== undefined && this.prefix !== null) {
            return key.indexOf(this.prefix) === 0;
        }
        return true;
    };
    AppInsightsBackend.prototype.parseKey = function (key) {
        if (this.prefix) {
            if (key.indexOf(this.prefix) === 0) {
                key = key.substr(this.prefix.length);
            }
        }
        var endOfNameIndex = key.indexOf("__");
        var metricName = endOfNameIndex > 0 ? key.substring(0, endOfNameIndex) : key;
        var properties = undefined;
        if (endOfNameIndex > 0) {
            var propertiesString = key.substring(endOfNameIndex + 2);
            try {
                var buffer = new Buffer(propertiesString, "base64");
                properties = JSON.parse(buffer.toString("utf8"));
            }
            catch (error) {
                this.aiClient.trackException(new Error("Failed to parse properties string from key '" + key + "': " + util.inspect(error)));
            }
        }
        return {
            metricname: metricName,
            properties: properties,
        };
    };
    AppInsightsBackend.init = function (startupTime, config, events) {
        var instance = new AppInsightsBackend(config);
        instance.init(events);
        return true;
    };
    return AppInsightsBackend;
}());
;
console.log("[aibackend] Started");
module.exports = AppInsightsBackend;

//# sourceMappingURL=appinsights.js.map
