const Discord = require('discord.js')
const client = new Discord.Client()
const Secrets = require('./secrets')

const VisualRecognitionV3 = require('watson-developer-cloud/visual-recognition/v3');
const NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1.js');
const LanguageTranslatorV2 = require('watson-developer-cloud/language-translator/v2');
const watson = require('watson-developer-cloud');

const languageTranslator = new LanguageTranslatorV2({
    username: process.env.NT_USERNAME,
    password: process.env.NT_PASSWORD,
    url: 'https://gateway.watsonplatform.net/language-translator/api/'
});
const nlu = new NaturalLanguageUnderstandingV1({
    username: process.env.NLU_USERNAME,
    password: process.env.NLU_PASSWORD,
    version_date: '2017-02-27',
    url: 'https://gateway.watsonplatform.net/natural-language-understanding/api/'
});



client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
    if (msg.content.startsWith('!HELP')) {
        msg.channel.send('Hello I am a bot here are some of my commands: _en-ja')
    }
})

//Translator
client.on('message', msg => {
    if (msg.content.slice(0, 7).match(/!..-../)) {
        let source = msg.content.slice(1, 3)
        let target = msg.content.slice(4, 6)
        languageTranslator.translate(
            {
                text: msg.content.slice(6),
                model_id: `${source}-${target}`,
                source: source,
                target: target
            },
            function (err, translation) {
                if (err) {
                    console.log('error:', err);
                } else {
                    msg.channel.send(translation.translations[0].translation)
                }
            }
        )
    }
    if (msg.content.startsWith('!?')) {
        setTimeout(() => {
            languageTranslator.translate(
                {
                    text: msg.content.slice(2),
                    source: 'en',
                    target: 'de'
                },
                function (err, translation) {
                    if (err) {
                        console.log('error:', err);
                    } else {
                        // console.log(translation.translations[0].translation)
                        msg.channel.send('German: ' + translation.translations[0].translation)

                    }
                }
            )
        }, 1300);

    }
    //Very messy portion of code to translate from de-en-ko-en
    if (msg.content.startsWith('German: ')) {
        setTimeout(() => {
            languageTranslator.translate(
                {
                    text: msg.content.slice(10),
                    model_id: 'de-en',
                    source: 'de',
                    target: 'en'
                },
                function (err, translation) {
                    if (err) {
                        console.log('error:', err);
                    } else {
                        // console.log(translation.translations[0].translation)
                        //msg.channel.send('worked: ' + translation.translations[0].translation)
                        languageTranslator.translate(
                            {
                                text: translation.translations[0].translation,
                                model_id: 'en-ko',
                                source: 'en',
                                target: 'ko'
                            },
                            function (err, translation) {
                                if (err) {
                                    console.log('error:', err);
                                } else {
                                    // console.log(translation.translations[0].translation)
                                    setTimeout(() => (msg.channel.send('Korean: ' + translation.translations[0].translation)), 1300)
                                    languageTranslator.translate(
                                        {
                                            text: translation.translations[0].translation,
                                            model_id: 'ko-en',
                                            source: 'ko',
                                            target: 'en'
                                        },
                                        function (err, translation) {
                                            if (err) {
                                                console.log('error:', err);
                                            } else {
                                                // console.log(translation.translations[0].translation)
                                                setTimeout(() => (msg.channel.send('English maybe: ' + translation.translations[0].translation)), 1300)

                                            }
                                        }
                                    )

                                }
                            }
                        )

                    }
                }
            )
        }, 1300);

    }

});
let listening = false

//Sentiment reaction
client.on('message', msg => {
    if (listening) {
        nlu.analyze(
            {
                text: msg.content,
                features: {
                    sentiment: {},
                }
            },
            function (err, response) {
                if (err) {
                    console.log('error:', err);
                } else {
                    if (response.sentiment.document.label === 'positive') {
                        msg.react('😃')
                    } else {
                        msg.react('😡')
                    }
                }
            }
        );
    }
    if (msg.content.startsWith('!hey-listen')) {
        listening = true;
    }
    if (msg.content.startsWith('!stop-it')) {
        listening = false;
    }


})


//Emotion analysis
client.on('message', (msg) => {
    if (msg.content.startsWith('!the-mood')) {
        let channelLog = ''
        msg.channel.fetchMessages({ limit: 50 }).then(mess => {
            for (let [key, value] of mess) {
                channelLog = channelLog + value.content + ' '
            }
            nlu.analyze(
                {
                    text: channelLog, // Buffer or String
                    features: {

                        emotion: {}
                    }
                },
                function (err, response) {
                    if (err) {
                        console.log('error:', err);
                    } else {
                        let emotions = {
                            sadness: response.emotion.document.emotion.sadness * 100,
                            joy: response.emotion.document.emotion.joy * 100,
                            fear: response.emotion.document.emotion.fear * 100,
                            disgust: response.emotion.document.emotion.disgust * 100,
                            anger: response.emotion.document.emotion.anger * 100,
                        }
                        for (let key in emotions) {
                            let bars = ''
                            for (let i = 0; i < emotions[key]; i++) {
                                bars = bars + '|'
                            }
                            msg.channel.send(`${key}: ${bars}`)
                        }
                    }
                }
            );

        })
    }
})

//Visual recognition
client.on('message', msg => {
    if (msg.content.startsWith('!profile-pic')) {


        var visualRecognition = new VisualRecognitionV3({
            api_key: process.env.VR_KEY,
            version_date: '2016-05-20',
        });

        var params = {
            url: msg.author.avatarURL
        };

        visualRecognition.classify(params, function (err, res) {
            if (err) {
                console.log(err);
            } else {
                console.log(res['images'][0].classifiers[0].classes[0].class);
                let classes = res['images'][0].classifiers[0].classes
                let otherClasses = classes.slice(2).map(obj => obj.class).join(', ')
                msg.channel.send(`Your profile pic might be ${classes[0].class} or maybe ${classes[1].class}. Or with increasingly less certainy: ${otherClasses}.`)
            }
        });
    }
    if (msg.content.startsWith('!what about the bot')) {
        msg.channel.send('!profile-pic');
    }
})

client.login(process.env.DISCORD_TOKEN);



