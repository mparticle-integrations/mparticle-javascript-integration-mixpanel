/* eslint-disable no-undef*/
//  Copyright 2015 mParticle, Inc.
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.

// ** Glossary of terms
// Mixpanel Terms:
// user_id: A unique identifier used by the Mixpanel.identify method to identify a unique user
// device_id: A unique identifier used by Mixpanel to identify an anonymous user, usually a guid
// distinct_id: A unique identifier that Mixpanel uses to bridge a user and a device. Usually the
//              distinct_id has a prefix of $device:guid<device_id> to denote an anonymouse user
//              and this will be replaced by the user_id once the user has been identified by
//              a request to Mixpanel.identify

// eslint-disable-next-line no-redeclare
var name = 'MixpanelEventForwarder',
    moduleId = 10,
    MessageType = {
        SessionStart: 1,
        SessionEnd: 2,
        PageView: 3,
        PageEvent: 4,
        CrashReport: 5,
        OptOut: 6,
        Commerce: 16,
    };

/* eslint-disable */
// prettier-ignore
var renderSnippet = function() {
    (function(e,b){if (!b.__SV){var a,f,i,g;window.mixpanel=b;b._i=[];b.init=function(a,e,d){function f(b,h){var a=h.split(".");2==a.length&&(b=b[a[0]],h=a[1]);b[h]=function(){b.push([h].concat(Array.prototype.slice.call(arguments,0)))}}var c=b;"undefined"!==typeof d?c=b[d]=[]:d="mixpanel";c.people=c.people||[];c.toString=function(b){var a="mixpanel";"mixpanel"!==d&&(a+="."+d);b||(a+=" (stub)");return a};c.people.toString=function(){return c.toString(1)+".people (stub)"};i="disable time_event track track_pageview track_links track_forms register register_once alias unregister identify name_tag set_config people.set people.set_once people.increment people.append people.union people.track_charge people.clear_charges people.delete_user".split(" ");
    for(g=0;g<i.length;g++)f(c,i[g]);b._i.push([a,e,d])};b.__SV=1.2;a=e.createElement("script");a.type="text/javascript";a.async=!0;a.src="undefined"!==typeof MIXPANEL_CUSTOM_LIB_URL?MIXPANEL_CUSTOM_LIB_URL:"file:"===e.location.protocol&&"//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js".match(/^\/\//)?"https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js":"//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js";f=e.getElementsByTagName("script")[0];f.parentNode.insertBefore(a,f)}})(document,window.mixpanel||[]);
}
/* eslint-enable */

// eslint-disable-next-line no-redeclare
var constructor = function () {
    var self = this,
        isInitialized = false,
        forwarderSettings = null,
        reportingService = null,
        useMixpanelPeople = false;

    self.name = name;

    function initForwarder(settings, service, testMode) {
        forwarderSettings = settings;
        useMixpanelPeople = forwarderSettings.useMixpanelPeople === 'True';
        reportingService = service;

        try {
            if (!testMode) {
                renderSnippet();
            }
            mixpanel.init(
                settings.token,
                {
                    api_host: forwarderSettings.baseUrl,
                },
                'mparticle'
            );

            isInitialized = true;

            return 'Successfully initialized: ' + name;
        } catch (e) {
            return 'Cannot initialize forwarder: ' + name + ': ' + e;
        }
    }

    function processEvent(event) {
        var reportEvent = false;

        if (!isInitialized) {
            return 'Cannot send to forwarder: ' + name + ', not initialized';
        }

        try {
            if (event.EventDataType == MessageType.PageEvent) {
                reportEvent = true;
                logEvent(event);
            } else if (event.EventDataType == MessageType.PageView) {
                event.EventName = 'Viewed ' + event.EventName;
                reportEvent = true;
                logEvent(event);
            } else if (
                event.EventDataType == MessageType.Commerce &&
                event.ProductAction &&
                event.ProductAction.ProductActionType ==
                    window.mParticle.ProductActionType.Purchase
            ) {
                reportEvent = true;
                logCommerceEvent(event);
            }

            if (reportEvent && reportingService) {
                reportingService(self, event);
            }

            return 'Successfully sent to forwarder: ' + name;
        } catch (e) {
            return 'Cannot send to forwarder: ' + name + ' ' + e;
        }
    }

    function setUserIdentity(id, type) {
        if (window.mParticle.getVersion()[0] !== '1') {
            return;
        }
        if (!id) {
            return (
                'Cannot call setUserIdentity on forwarder: ' +
                name +
                ' without ID'
            );
        }

        if (!isInitialized) {
            return (
                'Cannot call setUserIdentity on forwarder: ' +
                name +
                ', not initialized'
            );
        }

        try {
            if (window.mParticle.IdentityType.Alias == type) {
                mixpanel.mparticle.alias(id.toString());
            } else {
                mixpanel.mparticle.identify(id.toString());
            }

            return 'Successfully called identify on forwarder: ' + name;
        } catch (e) {
            return 'Cannot call identify on forwarder: ' + name + ': ' + e;
        }
    }

    function getUserIdentities(user) {
        return user.getUserIdentities()
            ? user.getUserIdentities().userIdentities
            : {};
    }

    function onLoginComplete(user) {
        var userIdentities = getUserIdentities(user);

        // When mParticle identifies a user, the user might
        // actually be anonymous. We only want to send an
        // identify request to Mixpanel if the user is
        // actually known. Only known (logged in) users
        // will have userIdentities.
        if (!isEmpty(userIdentities)) {
            sendIdentifyRequest(user, userIdentities);
        } else {
            return 'Logged in user does not have user identities and will not be sent to Mixpanel to Identify';
        }
    }

    function onLogoutComplete() {
        if (!isInitialized) {
            return (
                'Cannot call logout on forwarder: ' + name + ', not initialized'
            );
        }

        try {
            mixpanel.mparticle.reset();

            return 'Successfully called reset on forwarder: ' + name;
        } catch (e) {
            return 'Cannot call reset on forwarder: ' + name + ': ' + e;
        }
    }

    function sendIdentifyRequest(user, userIdentities) {
        var idForMixpanel;

        if (isEmpty(userIdentities)) {
            userIdentities = getUserIdentities(user);
        }

        switch (forwarderSettings.userIdentificationType) {
            case 'CustomerId':
                idForMixpanel = userIdentities.customerid;
                break;
            case 'MPID':
                idForMixpanel = user.getMPID();
                break;
            case 'Other':
                idForMixpanel = userIdentities.other;
                break;
            case 'Other2':
                idForMixpanel = userIdentities.other2;
                break;
            case 'Other3':
                idForMixpanel = userIdentities.other3;
                break;
            case 'Other4':
                idForMixpanel = userIdentities.other4;
                break;
            default:
                idForMixpanel = userIdentities.customerid;
                break;
        }

        if (!isInitialized) {
            return (
                'Cannot call identify on forwarder: ' +
                name +
                ', not initialized'
            );
        }

        try {
            mixpanel.mparticle.identify(idForMixpanel);

            return 'Successfully called identify on forwarder: ' + name;
        } catch (e) {
            return 'Cannot call identify on forwarder: ' + name + ': ' + e;
        }
    }

    function setUserAttribute(key, value) {
        var attr = {};
        attr[key] = value;

        try {
            if (useMixpanelPeople) {
                mixpanel.mparticle.people.set(attr);
            } else {
                mixpanel.mparticle.register(attr);
            }
        } catch (e) {
            return 'Cannot call register on forwarder: ' + name + ': ' + e;
        }
    }

    function removeUserAttribute(attribute) {
        try {
            if (useMixpanelPeople) {
                mixpanel.mparticle.people.unset(attribute);
            } else {
                mixpanel.mparticle.unregister(attribute);
            }
        } catch (e) {
            return 'Cannot call unregister on forwarder: ' + name + ': ' + e;
        }
    }

    function logEvent(event) {
        event.EventAttributes = event.EventAttributes || {};

        try {
            mixpanel.mparticle.track(event.EventName, event.EventAttributes);
        } catch (e) {
            return 'Cannot log event on forwarder: ' + name + ': ' + e;
        }
    }

    function logCommerceEvent(event) {
        if (!useMixpanelPeople) {
            return (
                'Cannot log commerce event on forwarder: ' +
                name +
                ', useMixpanelPeople flag is not set'
            );
        }

        try {
            mixpanel.mparticle.people.track_charge(
                event.ProductAction.TotalAmount,
                {
                    $time: new Date().toISOString(),
                }
            );
        } catch (e) {
            return 'Cannot log commerce event on forwarder: ' + name + ': ' + e;
        }
    }

    this.init = initForwarder;
    this.process = processEvent;
    this.setUserAttribute = setUserAttribute;
    this.setUserIdentity = setUserIdentity;
    this.removeUserAttribute = removeUserAttribute;

    this.onLoginComplete = onLoginComplete;

    // For all Identity Requests, we run mixpanel.identify(<user_id>)
    // as per Mixpanel's documentation https://docs.mixpanel.com/docs/tracking-methods/identifying-users
    // except when a user logs out, where we run mixpanel.reset() to
    // detach the Mixpanel distinct_id from the Mixpanel device_id
    this.onLogoutComplete = onLogoutComplete;

    // For these two methods, we are essentially passing along the
    // Identify request the same way.
    this.onIdentifyComplete = sendIdentifyRequest;
    this.onModifyComplete = sendIdentifyRequest;
};

function getId() {
    return moduleId;
}

function register(config) {
    if (!config) {
        console.log(
            'You must pass a config object to register the kit ' + name
        );
        return;
    }

    if (!isObject(config)) {
        console.log(
            '"config" must be an object. You passed in a ' + typeof config
        );
        return;
    }

    if (isObject(config.kits)) {
        config.kits[name] = {
            constructor: constructor,
        };
    } else {
        config.kits = {};
        config.kits[name] = {
            constructor: constructor,
        };
    }
    console.log(
        'Successfully registered ' + name + ' to your mParticle configuration'
    );
}

function isEmpty(value) {
    return value == null || !(Object.keys(value) || value).length;
}

function isObject(val) {
    return (
        val != null && typeof val === 'object' && Array.isArray(val) === false
    );
}

if (typeof window !== 'undefined') {
    if (window && window.mParticle && window.mParticle.addForwarder) {
        window.mParticle.addForwarder({
            name: name,
            constructor: constructor,
            getId: getId,
        });
    }
}

// eslint-disable-next-line no-undef
module.exports = {
    register: register,
};
