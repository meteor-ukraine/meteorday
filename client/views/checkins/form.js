var pictureUrl, suggestedLocations, updateLocation;

Template.checkinForm.helpers({
    currentLocation : function(){
        return Geolocation.latLng();
    },

    formDocument : function(){
        return {
            userId : Meteor.userId()
        };
    },

    pictureUrl : function(){
        return pictureUrl.get();
    },

    suggestedLocations : function(){
        var locations = suggestedLocations.get();
        return locations ? _.map(locations, function(location){

            // adjust data presentation to work nicely with
            // Autoform's select component

            return {
                label : location.name,
                value : location.name
            };
        }) : null;
    },

    currentUserProfile : function(){
        var user = Meteor.user();
        return user ? user.profile : null;
    },

    isFormExpanded : function(){
        return Session.get('checkin-form-expanded');
    }
});

Template.checkinForm.created = function(){
    pictureUrl = new ReactiveVar(null);
    suggestedLocations = new ReactiveVar(null);
    updateLocation = new ReactiveVar(true);
};

Template.checkinForm.rendered = function(){

    // XXX: patch against weird screen jumping behavior
    // https://github.com/twbs/ratchet/issues/632
    function isTextInput(node) {
        return ['INPUT', 'TEXTAREA', 'SELECT'].indexOf(node.nodeName) !== -1;
    }
    document.addEventListener('touchstart', function (e) {
        if (!isTextInput(e.target) && isTextInput(document.activeElement)) {
            document.activeElement.blur();
            e.preventDefault();
        }
    }, false);

    this.autorun(function(){
        // keep an eye on the location
        var location = Geolocation.latLng();
        
        // only poll foursquare when we have a location 
        // and the form is expanded
        if(location && Session.get('checkin-form-expanded')){
            Foursquare.explore(location.lat, location.lng, function(locations){
                if(updateLocation.get()){
                    suggestedLocations.set(locations);
                }
            });
        }
    });
};

Template.checkinForm.events({

    'click select[name="locationName"]' : function(e, template){
        // make sure we don't update location once location selector
        // gets activated
        updateLocation.set(false);
    },

    'blur select[name="locationName"]' : function(e, template){
        // we can restart location updates 
        // once location selector is deactivated
        updateLocation.set(true);
    },

    'click .checkin-prompt' : function(){
        Session.set('checkin-form-expanded',true);
    },

    'click .camera' : function(e, template){
        e.stopImmediatePropagation();

        template.$('input[type="submit"]')
            .attr('disabled','disabled');

        MeteorCamera.getPicture({
            width: 500,
            height: 500,
            quality: 100
        },
            function(error,data){
                if(!error){
                    pictureUrl.set(data);
                } else {
                    console.error('faield to take a picture. faking.', error);
                    pictureUrl.set('http://s2.favim.com/orig/35/cute-dog-puppy-Favim.com-281670.jpg');
                }

                template.$('input[type="submit"]')
                    .removeAttr('disabled');
            }
        );

        return false;
    }
});

AutoForm.hooks({
    checkinForm: {

        before: {
            insert: function(doc, template) {
                var locations = suggestedLocations ?
                    suggestedLocations.get() : [];
                
                if(doc.locationName){
                    var location = _.find(locations, function(l){
                        return l.name === doc.locationName;
                    });

                    if(location && location.data){
                        _.extend(doc, {
                            locationData : {
                                foursquare : location.data
                            }
                        });
                    }
                }


                if(typeof device !== 'undefined'){
                    _.extend(doc, {
                        device : {
                            model : device.model,
                            platform : device.platform,
                            version : device.version
                        }
                    });
                }

                return doc;
            }
        },

        onSuccess: function(operation, result, template) {
            // clean up reactive variables
            pictureUrl.set(null);
            Session.set('checkin-form-expanded',false);
        },

        onError: function(operation, error, template) {
            if(operation !== 'validation'){
                console.error('checkin failed', error);
                alert('did not work');
            }
        }
    }
});