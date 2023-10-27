/* eslint-disable no-undef*/
describe('Mixpanel Forwarder', function () {
    var ReportingService = function () {
            var self = this;
            this.id = null;
            this.event = null;

            this.cb = function (forwarder, event) {
                self.id = forwarder.id;
                self.event = event;
            };

            this.reset = function () {
                this.id = null;
                this.event = null;
            };
        },
        MessageType = {
            SessionStart: 1,
            SessionEnd: 2,
            PageView: 3,
            PageEvent: 4,
            CrashReport: 5,
            OptOut: 6,
            Commerce: 16,
        },
        EventType = {
            Unknown: 0,
            Navigation: 1,
            Location: 2,
            Search: 3,
            Transaction: 4,
            UserContent: 5,
            UserPreference: 6,
            Social: 7,
            Other: 8,
            Media: 9,
            getName: function () {
                return 'blahblah';
            },
        },
        ProductActionType = {
            Unknown: 0,
            AddToCart: 1,
            RemoveFromCart: 2,
            Checkout: 3,
            CheckoutOption: 4,
            Click: 5,
            ViewDetail: 6,
            Purchase: 7,
            Refund: 8,
            AddToWishlist: 9,
            RemoveFromWishlist: 10,
            getName: function () {
                return 'Action';
            },
        },
        PromotionActionType = {
            Unknown: 0,
            PromotionView: 1,
            PromotionClick: 2,
            getName: function () {
                return 'promotion action type';
            },
        },
        IdentityType = {
            Other: 0,
            CustomerId: 1,
            Facebook: 2,
            Twitter: 3,
            Google: 4,
            Microsoft: 5,
            Yahoo: 6,
            Email: 7,
            Alias: 8,
            FacebookCustomAudienceId: 9,
            getName: function () {
                return 'CustomerID';
            },
        },
        reportService = new ReportingService();

    function MPMock() {
        var self = this;
        var calledMethods = [
            'alias',
            'track',
            'identify',
            'register',
            'unregister',
            'trackCharge',
            'clearCharges',
        ];
        this.mparticle = { people: {}, data: {} };
        for (var i = 0; i < calledMethods.length; i++) {
            this.mparticle[calledMethods[i] + 'Called'] = false;
        }

        this.mparticle.track = function (eventName, data) {
            setCalledAttributes([eventName, data], 'trackCalled');
        };

        this.mparticle.identify = function (data) {
            setCalledAttributes(data, 'identifyCalled');
        };

        this.mparticle.reset = function (data) {
            setCalledAttributes(data, 'resetCalled');
        };

        this.mparticle.alias = function (data) {
            setCalledAttributes(data, 'aliasCalled');
        };

        this.mparticle.register = function (data) {
            setCalledAttributes(data, 'registerCalled');
        };

        this.mparticle.unregister = function (data) {
            setCalledAttributes(data, 'unregisterCalled');
        };

        this.mparticle.people.set = function (data) {
            setCalledAttributes(data, 'setCalled');
        };

        this.mparticle.people.unset = function (data) {
            setCalledAttributes(data, 'unsetCalled');
        };

        this.mparticle.people.track_charge = function (data) {
            setCalledAttributes(data, 'trackChargeCalled');
        };

        this.mparticle.people.clear_charges = function (data) {
            setCalledAttributes(data, 'clearChargeCalled');
        };

        function setCalledAttributes(data, attr) {
            self.mparticle.data = data;
            self.mparticle[attr] = true;
        }
        this.init = function (token, settings, instance) {
            self.token = token;
            self.settings = settings;
            self.instance = instance;
        };
    }
    var API_HOST = 'https://api.mixpanel.com';

    var identificationTypes = [
        {
            userIdentificationType: 'CustomerId',
            expectedProperty: 'cust1',
        },
        {
            userIdentificationType: 'Other',
            expectedProperty: 'other1',
        },
        {
            userIdentificationType: 'Other2',
            expectedProperty: 'other2',
        },
        {
            userIdentificationType: 'Other3',
            expectedProperty: 'other3',
        },
        {
            userIdentificationType: 'Other4',
            expectedProperty: 'other4',
        },
    ];

    beforeEach(function () {
        window.mixpanel = new MPMock();
        mParticle.forwarder.init(
            {
                token: 'token123',
                includeUserAttributes: 'True',
                baseUrl: API_HOST,
            },
            reportService.cb,
            true
        );

        mParticle.ProductActionType = ProductActionType;
        mParticle.EventType = EventType;
        mParticle.IdentityType = IdentityType;
        mParticle.PromotionType = PromotionActionType;
    });

    describe('initialization', function () {
        it('should pass all include the custom baseUrl', function (done) {
            window.mixpanel.token = 'token123';
            window.mixpanel.settings.api_host.should.equal(API_HOST);
            window.mixpanel.instance.should.equal('mparticle');

            done();
        });

        it('should log a page view with "Viewed" prepended to the event name', function (done) {
            mParticle.forwarder.process({
                EventDataType: MessageType.PageView,
                EventName: 'Test Page Event',
            });

            window.mixpanel.mparticle.should.have.property('trackCalled', true);
            window.mixpanel.mparticle.data.should.be
                .instanceof(Array)
                .and.have.lengthOf(2);

            window.mixpanel.mparticle.data[0].should.be.type('string');
            window.mixpanel.mparticle.data[1].should.be.instanceof(Object);

            window.mixpanel.mparticle.data[0].should.be.equal(
                'Viewed Test Page Event'
            );
            window.mixpanel.mparticle.data[1].should.be.an
                .Object()
                .and.be.empty();

            done();
        });
    });

    describe('Logging events', function () {
        it('should log event', function (done) {
            mParticle.forwarder.process({
                EventDataType: MessageType.PageEvent,
                EventName: 'Test Page Event',
            });

            window.mixpanel.mparticle.should.have.property('trackCalled', true);
            window.mixpanel.mparticle.data.should.be
                .instanceof(Array)
                .and.have.lengthOf(2);

            window.mixpanel.mparticle.data[0].should.be.type('string');
            window.mixpanel.mparticle.data[1].should.be.instanceof(Object);

            window.mixpanel.mparticle.data[0].should.be.equal(
                'Test Page Event'
            );
            window.mixpanel.mparticle.data[1].should.be.an
                .Object()
                .and.be.empty();

            done();
        });

        it('should log a page view with "Viewed" prepended to the event name', function (done) {
            mParticle.forwarder.process({
                EventDataType: MessageType.PageView,
                EventName: 'Test Page Event',
            });

            window.mixpanel.mparticle.should.have.property('trackCalled', true);
            window.mixpanel.mparticle.data.should.be
                .instanceof(Array)
                .and.have.lengthOf(2);

            window.mixpanel.mparticle.data[0].should.be.type('string');
            window.mixpanel.mparticle.data[1].should.be.instanceof(Object);

            window.mixpanel.mparticle.data[0].should.be.equal(
                'Viewed Test Page Event'
            );
            window.mixpanel.mparticle.data[1].should.be.an
                .Object()
                .and.be.empty();

            done();
        });
    });

    describe('User events', function () {
        it('should alias user', function (done) {
            window.mParticle.getVersion = function () {
                return '1.0.0';
            };
            mParticle.forwarder.setUserIdentity(
                'dpatel@mparticle.com',
                mParticle.IdentityType.Alias
            );
            window.mixpanel.mparticle.should.have.property('aliasCalled', true);
            window.mixpanel.mparticle.should.have.property(
                'data',
                'dpatel@mparticle.com'
            );

            done();
        });

        it('should identify user (mParticle SDK v1)', function (done) {
            window.mParticle.getVersion = function () {
                return '1.0.0';
            };
            mParticle.forwarder.setUserIdentity(
                'dpatel@mparticle.com',
                mParticle.IdentityType.CustomerId
            );
            window.mixpanel.mparticle.should.have.property(
                'identifyCalled',
                true
            );
            window.mixpanel.mparticle.should.have.property(
                'data',
                'dpatel@mparticle.com'
            );

            done();
        });

        it('should log in a user (mParticle SDK v2)', function (done) {
            var user = {
                getUserIdentities: function () {
                    return {
                        userIdentities: {
                            customerid: 'cust1',
                            other: 'other1',
                            other2: 'other2',
                            other3: 'other3',
                            other4: 'other4',
                        },
                    };
                },
                getMPID: function () {
                    return 'mpid1';
                },
            };

            identificationTypes.forEach(function (identificationType) {
                mParticle.forwarder.init(
                    {
                        includeUserAttributes: 'True',
                        userIdentificationType:
                            identificationType.userIdentificationType,
                    },
                    reportService.cb,
                    true
                );

                mParticle.forwarder.onLoginComplete(user);
                window.mixpanel.mparticle.should.have.property(
                    'identifyCalled',
                    true
                );
                window.mixpanel.mparticle.should.have.property(
                    'data',
                    identificationType.expectedProperty
                );
            });

            done();
        });

        it('should NOT log in a user if they do not have user identities (mParticle SDK v2)', function (done) {
            var user = {
                getUserIdentities: function () {
                    return {
                        userIdentities: {},
                    };
                },
                getMPID: function () {
                    return 'anon-mpid1';
                },
            };

            identificationTypes.forEach(function (identificationType) {
                mParticle.forwarder.init(
                    {
                        includeUserAttributes: 'True',
                        userIdentificationType:
                            identificationType.userIdentificationType,
                    },
                    reportService.cb,
                    true
                );

                mParticle.forwarder.onLoginComplete(user);
                window.mixpanel.mparticle.should.have.property(
                    'identifyCalled',
                    false
                );
                window.mixpanel.mparticle.should.not.have.property(
                    'data',
                    identificationType.expectedProperty
                );
            });
            done();
        });

        it('should identify a user (mParticle SDK v2)', function (done) {
            var user = {
                getUserIdentities: function () {
                    return {
                        userIdentities: {
                            customerid: 'cust1',
                            other: 'other1',
                            other2: 'other2',
                            other3: 'other3',
                            other4: 'other4',
                        },
                    };
                },
                getMPID: function () {
                    return 'mpid1';
                },
            };

            identificationTypes.forEach(function (identificationType) {
                mParticle.forwarder.init(
                    {
                        includeUserAttributes: 'True',
                        userIdentificationType:
                            identificationType.userIdentificationType,
                    },
                    reportService.cb,
                    true
                );

                mParticle.forwarder.onIdentifyComplte(user);
                window.mixpanel.mparticle.should.have.property(
                    'identifyCalled',
                    true
                );
                window.mixpanel.mparticle.should.have.property(
                    'data',
                    identificationType.expectedProperty
                );
            });

            done();
        });

        it('should modify a user identity (mParticle SDK v2)', function (done) {
            var user = {
                getUserIdentities: function () {
                    return {
                        userIdentities: {
                            customerid: 'cust1',
                            other: 'other1',
                            other2: 'other2',
                            other3: 'other3',
                            other4: 'other4',
                        },
                    };
                },
                getMPID: function () {
                    return 'mpid1';
                },
            };

            identificationTypes.forEach(function (identificationType) {
                mParticle.forwarder.init(
                    {
                        includeUserAttributes: 'True',
                        userIdentificationType:
                            identificationType.userIdentificationType,
                    },
                    reportService.cb,
                    true
                );

                mParticle.forwarder.onModifyComplete(user);
                window.mixpanel.mparticle.should.have.property(
                    'identifyCalled',
                    true
                );
                window.mixpanel.mparticle.should.have.property(
                    'data',
                    identificationType.expectedProperty
                );
            });

            done();
        });

        it('should log out a user (mParticle SDK v2)', function (done) {
            mParticle.forwarder.init(
                {
                    includeUserAttributes: 'True',
                    userIdentificationType: 'MPID',
                },
                reportService.cb,
                true
            );

            mParticle.forwarder.onLogoutComplete();
            window.mixpanel.mparticle.should.have.property('resetCalled', true);

            done();
        });

        it('should register a user', function (done) {
            mParticle.forwarder.setUserAttribute(
                'email',
                'dpatel@mparticle.com'
            );
            window.mixpanel.mparticle.should.have.property(
                'registerCalled',
                true
            );
            window.mixpanel.mparticle.data.should.be.an
                .instanceof(Object)
                .and.have.property('email', 'dpatel@mparticle.com');

            done();
        });

        it('should unregister a user', function (done) {
            mParticle.forwarder.removeUserAttribute('dpatel@mparticle.com');
            window.mixpanel.mparticle.should.have.property(
                'unregisterCalled',
                true
            );
            window.mixpanel.mparticle.should.have.property(
                'data',
                'dpatel@mparticle.com'
            );

            done();
        });
    });

    describe('People Properties', function () {
        it('should set a user property', function (done) {
            mParticle.forwarder.init(
                {
                    useMixpanelPeople: 'True',
                },
                reportService.cb,
                true
            );

            mParticle.forwarder.setUserAttribute(
                'email',
                'dpatel@mparticle.com'
            );
            window.mixpanel.mparticle.should.have.property('setCalled', true);
            window.mixpanel.mparticle.data.should.be.an
                .instanceof(Object)
                .and.have.property('email', 'dpatel@mparticle.com');

            done();
        });

        it('should unset a user property', function (done) {
            mParticle.forwarder.init(
                {
                    useMixpanelPeople: 'True',
                },
                reportService.cb,
                true
            );

            mParticle.forwarder.removeUserAttribute(
                'email',
                'dpatel@mparticle.com'
            );
            window.mixpanel.mparticle.should.have.property('unsetCalled', true);
            window.mixpanel.mparticle.data.should.be.an
                .instanceof(Object)
                .and.not.have.property('email', 'dpatel@mparticle.com');

            done();
        });
    });

    describe('Transaction events', function () {
        it('should track charge event', function (done) {
            mParticle.forwarder.init(
                {
                    includeUserAttributes: 'True',
                    useMixpanelPeople: 'True',
                },
                reportService.cb,
                true
            );

            mParticle.forwarder.process({
                EventDataType: MessageType.Commerce,
                EventName: 'Test Purchase Event',
                ProductAction: {
                    ProductActionType: mParticle.ProductActionType.Purchase,
                    TotalAmount: 10,
                },
            });

            window.mixpanel.mparticle.should.have.property(
                'trackChargeCalled',
                true
            );
            window.mixpanel.mparticle.should.have.property('data', 10);

            done();
        });

        it('should enfore useMixpanelPeople to charge', function (done) {
            window.mixpanel = new MPMock();
            mParticle.forwarder.init(
                {
                    includeUserAttributes: 'True',
                    baseUrl: 'api.mixpanel.com',
                },
                reportService.cb,
                true
            );

            mParticle.forwarder.process({
                EventDataType: MessageType.Commerce,
                EventName: 'Test Purchase Event',
                ProductAction: {
                    ProductActionType: mParticle.ProductActionType.Purchase,
                    TotalAmount: 10,
                },
            });

            window.mixpanel.mparticle.should.have.property(
                'trackChargeCalled',
                false
            );
            window.mixpanel.mparticle.should.have.property('data', {});

            done();
        });
    });
});
