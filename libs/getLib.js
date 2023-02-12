const fetch = (...args) =>
    import ('node-fetch').then(({ default: fetch }) => fetch(...args));
const cheerio = require('cheerio');
const sqlLib = require('./sqlLib');

const scrapeCats = async () => {
    const baseUrl = 'https://spa33.fr/chats/page/';
    baseresponse = await fetch(baseUrl+'1');
    basehtml = await baseresponse.text();
    base$ = cheerio.load(basehtml);
    const nbPages = Math.ceil(parseInt(base$('.message').html().replace(/\D/g, "")) / 10);
    const colors_inputs = base$('input[name="filter_cat_color[]"]');
    const colors = [];
    colors_inputs.each((i, el) => {
        color = {}
        color['id'] = base$(el).attr('value');
        color['name'] = base$(el).parent().text().trim();
        colors.push(color);
    });
	colors.forEach(color => {
		sqlLib.run('INSERT IGNORE INTO `colors` (`color_id`, `name`) VALUES ('+color.id+', "'+color.name+'")');
	});
    const cats = [];

    for (let i = 1; i <= nbPages; i++) {
        const url = baseUrl + i;
        const response = await fetch(url);
        const html = await response.text();
        const $ = cheerio.load(html);

        for (const el of $('article.chien_card_container').toArray()) {
            const id = $(el).attr('id');
            const name = $(el).find('.txt_wrapper h2 a').text().split("(")[0].trim();
            const birthYear = $(el).find('.txt_wrapper ul li').eq(0).text().split(':')[1].trim();
            const genderStr = $(el).find('.txt_wrapper ul li').eq(1).text().split(':')[1].trim();
            const gender = genderStr.toLowerCase() === 'femelle' ? 1 : genderStr.toLowerCase() === 'mâle' ? 0 : null;
            const colorStr = $(el).find('.txt_wrapper ul li').eq(2).text().split(':')[1].trim();
            const color = colors.find(color => color.name === colorStr);
            const description = $(el).find('.txt_wrapper p').text().split('\n')[0].replace(/\u00A0/g, '').trim();
            const medallionNumber = $(el).find('.dog_ctas .pill span.ref').text().trim();
            nbLikes = parseInt($(el).find('.hdla_container b').text().trim());
			if(isNaN(nbLikes)) nbLikes = 0;
            const isReserved = name.includes('Réservé');
            const isAdopted = $(el).find('.adopte').length > 0;
            const hasCarousel = $(el).find('.carousel').length > 0;
            const videoLink = $(el).find('a[data-video_url]');
            const videoUrl = videoLink.attr('data-video_url') ? videoLink.attr('data-video_url') : null;
            let images = [];
            if (hasCarousel) {
              $(el).find('.carousel-item img').each((i, el) => {
                images.push($(el).attr('src'));
              });
            } else {
              images.push($(el).find('.img_wrapper img').attr('src'));
            }
            const detailsLink = $(el).find('a.btn.btn-primary').attr('href');
            let details_link = "";
            let size = null;
            if (detailsLink != undefined && detailsLink.includes('/chat/')) {
              details_link = $(el).find('a.btn.btn-primary').attr('href');
              const res = await fetch(details_link);
              const reshtml = await res.text();
              const res$ = cheerio.load(reshtml);
              const sizeEl = res$('li:contains("Taille")');
              if (sizeEl.length > 0) {
                size =  sizeEl[0].children[1].data.trim()
              }
            } else {
              details_link = null;
            }
            const cat = { id, name, birthYear, gender, color, size, description, medallionNumber, nbLikes, isReserved, isAdopted, details_link, images, videoUrl };
            cats.push(cat);
          }
    }
    return cats;
};
scrapeCats().then(cats => {
	sql = "INSERT IGNORE INTO `cats` (`cat_id`, `name`, `birth_year`, `gender`, `size`, `color_id`, `description`, `medal_number`, `nb_likes`, `is_reserved`, `is_adopted`, `details_url`, `video_url`) VALUES ";
	cats.forEach(cat => {
		sql += "("
		sql += cat.id + ", ";
		sql += "'" + cat.name + "', ";
		sql += cat.birthYear + ", ";
		sql += cat.gender + ", ";
		sql += "'" + cat.size + "', ";
		sql += cat.color.id + ", ";
		sql += "'" + cat.description + "', ";
		sql += "'" + cat.medallionNumber + "', ";
		sql += cat.nbLikes + ", ";
		sql += cat.isReserved + ", ";
		sql += cat.isAdopted + ", ";
		sql += "'" + cat.details_link + "', ";
		sql += "'" + cat.videoUrl + "'";
		sql += "),";
	});
	sql = sql.slice(0, -1);
	sql += ";";
	sql += "INSERT INTO `cat_images` (`cat_id`, `url`) VALUES ";
	cats.forEach(cat => {
		cat.images.forEach(image => {
			sql += "("
			sql += cat.id + ", ";
			sql += "'" + image + "'";
			sql += "),";
		});
	});
	sql = sql.slice(0, -1);
	sql += ";";
	sqlLib.run(sql);
    // console.log(JSON.stringify(cats, null, 2));
	process.exit();
});
