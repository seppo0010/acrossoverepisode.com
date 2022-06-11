# acrossoverepisode.com

![What is this? A crossover episode?](https://acrossoverepisode-assets.storage.googleapis.com/twitter_card.png)

Search for your favorites BoJack quotes!

## Is this legal?

Let's start by saying I am not a lawyer, so the following is my understanding
of the [Fair Use doctrine](https://en.wikipedia.org/wiki/Fair_use).

There are four criterias one has to see to determine whether something is fair
use:

1. The purpose and character of the use, including whether such use is of
   commercial nature or is for nonprofit educational purposes

   The use in this case is non commercial, and the purpose is different from
   the one the series does, as the primary function is to share specific scenes
   and not to entertain.

2. The nature of the copyright work

   Do we know whether BoJack Horseman is not based on a true story?
   Yeah, this problably doesn't work.

3. The amount and substantiality of the portion used in relation to the
   copyrighted work as a whole

   The number of frames used for each episode is around 700 hundreds while the
   whole episode is over 30.000 frames. However it does contain the full
   transcription, although not the audio. Does it contain the "heart" of the
   work? More like a ventricle.

4. The effect of the use upon the potential market for, or value of, the
   copyrighted work

   No one will stop watching BoJack Horseman because of this site. If anything
   people are more likely to watch it as this encourages sharing in social
   media, sparking interest on new audiences.

My personal assessment is that it is fair use. However if you own the copyright
and you want me to take it down, I will do it, just send me an email to
[seppo0010@gmail.com](seppo0010@gmail.com). However before you do that, 
[Is it possible maybe when the other guys tried to copyright the name BoJack
Horseman, they wrote down something else by mistake, so "BoJack Horseman" is
still up for grabs?
](https://acrossoverepisode-assets.storage.googleapis.com/copyright.png)

[Some](https://www.eff.org/document/ruling-appeals-court)
[interesting](https://www.copyright.gov/fair-use/summaries/fox-news-network-tveyes-02272018.pdf)
[links](https://www.forbes.com/sites/propointgraphics/2016/04/30/animated-gifs-and-fair-use-what-is-and-isnt-legal-according-to-copyright-law/).


## How do I run this? Can I make my own?

Sure thing! You can provide your own videos with subtitles and get your still
images and search index using
[datamaker](https://github.com/seppo0010/isthisacrossoverepisode.com-datamaker/).
You will then have to upload those into a static web server.

Set up the following environment variables:
* `REACT_APP_TITLE`
* `REACT_APP_ASSETS_URL`
* `PUBLIC_URL`
* `REACT_APP_SUBTITLE`
* `REACT_APP_PLACEHOLDER`
* `REACT_APP_TWITTER_CREATOR`

`npm run build` and upload the `build` directory
