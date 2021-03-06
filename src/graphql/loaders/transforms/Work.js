'use strict';
/**
 * @file
 * Transformation of request to and response from the Opensearch webservice,
 * for presentation of work data.
 */

import xpath from 'xpath';
import xmldom from 'xmldom';

function  getXPathSelector(xmlString) {
    // Document
    let doc = (new xmldom.DOMParser()).parseFromString(xmlString);

    // Namespaces in document
    let select = xpath.useNamespaces({
      'SOAP-ENV': 'http://schemas.xmlsoap.org/soap/envelope/',
      ac: 'http://biblstandard.dk/ac/namespace/',
      dc: 'http://purl.org/dc/elements/1.1/',
      dcterms: 'http://purl.org/dc/terms/',
      dkabm: 'http://biblstandard.dk/abm/namespace/dkabm/',
      dkdcplus: 'http://biblstandard.dk/abm/namespace/dkdcplus/',
      oss: 'http://oss.dbc.dk/ns/osstypes',
      xsi: 'http://www.w3.org/2001/XMLSchema-instance',
      opensearch: 'http://oss.dbc.dk/ns/opensearch'
    });

    /**
     * @method This method queries the xmldocument
     * @param selector, selecter is the xpath select to be used
     * @param first, first describes if first value is wanted.
     * @param allStrings, returns an array of unique strings matching selector
     */
    return (selector, first, allStrings) => {
      let val = select(selector, doc);
      if (first) {
        return val[0] && val[0].nodeValue ? val[0].nodeValue : '';
      }

      if (allStrings) {
        return val.map((node) => {
          return node.nodeValue;
        }).filter((value, index, self) => {
          return self.indexOf(value) === index;
        });
      }

      return val;
    };
  }

function responseTransformWork(response) {
  let workDOM = getXPathSelector(response.raw);
  const newSelector = workDOM('//opensearch:collection').toString();
  return responseTransformSingleWork(getXPathSelector(newSelector));
}

function responseTransformSingleWork(workDOM) {
    let data = {};
    data.work = {
      pid: '',
      title: '',
      fullTitle: '',
      alternativeTitle: '',
      creator: '',
      contributers: [],
      abstract: '',
      isbns: [],
      extent: '',
      actors: [],
      series: '',
      subjects: [],
      dk5s: [],
      audience: {
        age: [],
        pegi: '',
        medieraad: '',
        type: ''
      },
      tracks: [],
      languages: [],
      editions: []
    };

  // Get general work information
  data.work.pid = workDOM('//primaryObjectIdentifier/text()', true, false);
  data.work.title = workDOM('//title/text()', true, false);
  data.work.fullTitle = workDOM('//dc:title[@type="full"]/text()', true, false);
  data.work.alternativeTitle = workDOM('//alternative/text()', true, false);
  data.work.creator = workDOM('//creator[@type="dkdcplus:aut"]/text()', true, false);
  data.work.contributers = workDOM('//contributor[@type!="act"]/text()', false, true);
  data.work.abstract = workDOM('//abstract/text()', true, false);
  data.work.isbns = workDOM('//identifier[@type="ISBN"]/text()', false, true);
  data.work.extent = workDOM('//extent/text()', true, false);
  data.work.actors = workDOM('//contributor[@type="act"]/text()', false, true);
  data.work.series = workDOM('//description[@type="series"]/text()', true, false);
  data.work.series = data.work.series.length > 0 ? data.work.series : workDOM('//dc:title[@xsi:type="dkdcplus:series"]/text()', true, false);
  data.work.subjects = workDOM('//subject[@type="dkdcplus:DBCS"]/text()', false, true);
  data.work.dk5s = workDOM('//dc:subject[@type="dkdcplus:DK5"]/text()', false, true).map((dk5, index) => {
    const newIndex = index + 1;
    return {
      text: workDOM('//dc:subject[@xsi:type="dkdcplus:DK5-Text"][' + newIndex + ']/text()', true, false),
      value: dk5
    };
  });
  data.work.audience.type = workDOM('//audience/text()', true, false);
  data.work.audience.age = workDOM('//subject[@type="dkdcplus:DBCN"]/text()', false, true);
  data.work.audience.medieraad = workDOM('//audience[@type="dkdcplus:medieraad"]/text()', true, false);
  data.work.audience.pegi = workDOM('//audience[@type="dkdcplus:pegi"]/text()', true, false);
  data.work.tracks = workDOM('//hasPart[@type="dkdcplus:track"]/text()', false, true);
  data.work.languages = workDOM('//language[not(@type)]/text()', false, true);

  // Iterate over manifestations, match them to a dkabm record and populate an object
    data.work.editions = workDOM('//manifestation', false, false).map((manifestation, index) => {
      const newIndex = index + 1;
      let edition = {
        accessType: '',
        creator: '',
        date: '',
        edition: '',
        extent: '',
        identifier: '',
        isbns: [],
        link: [],
        publisher: '',
        title: '',
        type: '',
        workType: ''
      };

      edition.accessType = workDOM('//opensearch:manifestation[' + newIndex + ']/opensearch:accessType/text()', true, false);
      edition.creator = workDOM('//opensearch:manifestation[' + newIndex + ']/opensearch:creator/text()', true, false);
      edition.date = workDOM('//opensearch:object[' + newIndex + ']/*/dc:date/text()', true, false);
      edition.edition = workDOM('//opensearch:object[' + newIndex + ']/*/dkdcplus:version/text()', true, false);
      edition.extent = workDOM('//opensearch:object[' + newIndex + ']/*/dcterms:extent/text()', true, false);
      edition.identifier = workDOM('//opensearch:manifestation[' + newIndex + ']/opensearch:identifier/text()', true, false);
      edition.isbns = workDOM('//opensearch:object[' + newIndex + ']/*/dc:identifier[@xsi:type="dkdcplus:ISBN"]/text()', false, true);
      edition.link = workDOM('//opensearch:object[' + newIndex + ']/*/dc:identifier[@xsi:type="dcterms:URI"]/text()', false, true);
      edition.publisher = workDOM('//opensearch:object[' + newIndex + ']/*/dc:publisher/text()', true, false);
      edition.title = workDOM('//opensearch:manifestation[' + newIndex + ']/opensearch:title/text()', true, false);
      edition.type = workDOM('//opensearch:manifestation[' + newIndex + ']/opensearch:type/text()', true, false);
      edition.workType = workDOM('//opensearch:manifestation[' + newIndex + ']/opensearch:workType/text()', true, false);
      return edition;
    });
    return data.work;
  }


function responseTransformRelations(response) {
  // Function which takes xpath
  let workDOM = getXPathSelector(response.raw);

  const relations =  workDOM('//opensearch:collection/opensearch:object/opensearch:relations/opensearch:relation', false, false).map((relation, index) => {
    const newIndex = index + 1;
    let rel = {
      link: '',
      type: '',
      access: '',
      accessType: '',
      collection: ''
    };
    rel.link = workDOM('//opensearch:object/opensearch:relations/opensearch:relation[' + newIndex + ']/opensearch:relationUri/text()', true, false);
    rel.type = workDOM('//opensearch:object/opensearch:relations/opensearch:relation[' + newIndex + ']/opensearch:relationType/text()', true, false);
    rel.access = workDOM('//opensearch:object/opensearch:relations/opensearch:relation[' + newIndex + ']/opensearch:linkObject/opensearch:access/text()', true, false);
    rel.accessType = workDOM('//opensearch:object/opensearch:relations/opensearch:relation[' + newIndex + ']/opensearch:linkObject/opensearch:accessType/text()', true, false);
    rel.collection = workDOM('//opensearch:object/opensearch:relations/opensearch:relation[' + newIndex + ']/opensearch:linkObject/opensearch:linkCollectionIdentifier/text()',
      false, true);
    return rel;

  });

  return relations;
}

import {GraphQLError} from 'graphql';

function responseTransformList(response){
  if (response.error) {
    return new Error(response.error);
  }

  //console.log(response.result);
  let workDOM = getXPathSelector(response.raw);
  const work = workDOM('//opensearch:searchResult', false, false)
    .map((element, index) =>{
    let workDOM = getXPathSelector(element.toString());
    return responseTransformSingleWork(workDOM);
  });
  return {work};
}

export default {
  list: responseTransformList,
  work: responseTransformWork,
  relations: responseTransformRelations
}