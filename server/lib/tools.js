Tools = {
    slugify: function(str){
        return str.toLowerCase().replace(/ /g,'-').replace(/[^\w-]+/g,'');
    },
    getRandomInt : function (min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    getRandomUser : function(){
        var users = Meteor.users.find({}).fetch();
        return users[this.getRandomInt(0,users.length-1)];
    }
};