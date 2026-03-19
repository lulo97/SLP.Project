// questions-api-test-utils.js
const { test, expect } = require('@playwright/test');

const API_BASE_URL = 'http://localhost:5140/api';

const adminUser = {
  username: 'admin',
  password: '123',
};

function generateQuestion(type = 'multiple_choice') {
  const id = Date.now() + Math.floor(Math.random() * 10000);
  const base = {
    multiple_choice: {
      type: 'multiple_choice',
      content: `What is the capital of France? ${id}`,
      explanation: `Paris is the capital of France. ${id}`,
      metadataJson: JSON.stringify({
        options: [
          { id: 'a', text: 'London' },
          { id: 'b', text: 'Paris' },
          { id: 'c', text: 'Berlin' },
          { id: 'd', text: 'Madrid' }
        ],
        correctAnswers: ['b']
      }),
      tagNames: ['geography', 'capitals', 'test']
    },
    true_false: {
      type: 'true_false',
      content: `The Earth is flat. ${id}`,
      explanation: `The Earth is an oblate spheroid. ${id}`,
      metadataJson: JSON.stringify({
        correctAnswer: false
      }),
      tagNames: ['science', 'facts', 'test']
    },
    fill_blank: {
      type: 'fill_blank',
      content: `The chemical symbol for water is H2O. ${id}`,
      explanation: `H2O is the chemical formula for water. ${id}`,
      metadataJson: JSON.stringify({
        keywords: ['H2O']
      }),
      tagNames: ['chemistry', 'science', 'test']
    },
    matching: {
      type: 'matching',
      content: `Match the countries with their capitals. ${id}`,
      explanation: `Testing matching. ${id}`,
      metadataJson: JSON.stringify({
        pairs: [
          { id: 1, left: 'France', right: 'Paris' },
          { id: 2, left: 'Germany', right: 'Berlin' },
          { id: 3, left: 'Italy', right: 'Rome' }
        ]
      }),
      tagNames: ['geography', 'matching', 'test']
    },
    ordering: {
      type: 'ordering',
      content: `Put the planets in order from the sun. ${id}`,
      explanation: `Testing ordering. ${id}`,
      metadataJson: JSON.stringify({
        items: [
          { order_id: 1, text: 'Mercury' },
          { order_id: 2, text: 'Venus' },
          { order_id: 3, text: 'Earth' },
          { order_id: 4, text: 'Mars' }
        ]
      }),
      tagNames: ['astronomy', 'ordering', 'test']
    }
  };
  return base[type] || base.multiple_choice;
}

function generateInvalidQuestion(type, invalidCase) {
  const base = generateQuestion(type);
  const metadata = JSON.parse(base.metadataJson);
  const invalidData = { ...base, metadataJson: '' };

  switch (type) {
    case 'multiple_choice':
      if (invalidCase === 'missing options') {
        delete metadata.options;
      } else if (invalidCase === 'options not array') {
        metadata.options = 'not an array';
      } else if (invalidCase === 'less than 2 options') {
        metadata.options = [{ id: 'a', text: 'Only one' }];
      } else if (invalidCase === 'option missing id') {
        metadata.options = [{ text: 'No id' }, { id: 'b', text: 'ok' }];
      } else if (invalidCase === 'option missing text') {
        metadata.options = [{ id: 'a' }, { id: 'b', text: 'ok' }];
      } else if (invalidCase === 'option empty text') {
        metadata.options = [{ id: 'a', text: '' }, { id: 'b', text: 'ok' }];
      } else if (invalidCase === 'duplicate option id') {
        metadata.options = [
          { id: 'a', text: 'first' },
          { id: 'a', text: 'second' }
        ];
      } else if (invalidCase === 'missing correctAnswers') {
        delete metadata.correctAnswers;
      } else if (invalidCase === 'correctAnswers empty') {
        metadata.correctAnswers = [];
      } else if (invalidCase === 'correctAnswer id not in options') {
        metadata.correctAnswers = ['x'];
      }
      break;

    case 'true_false':
      if (invalidCase === 'missing correctAnswer') {
        delete metadata.correctAnswer;
      } else if (invalidCase === 'correctAnswer not boolean') {
        metadata.correctAnswer = 'true';
      }
      break;

    case 'fill_blank':
      if (invalidCase === 'missing keywords') {
        delete metadata.keywords;
      } else if (invalidCase === 'keywords not array') {
        metadata.keywords = 'H2O';
      } else if (invalidCase === 'keywords empty array') {
        metadata.keywords = [];
      } else if (invalidCase === 'more than one keyword') {
        metadata.keywords = ['H2O', 'water'];
      } else if (invalidCase === 'keyword empty string') {
        metadata.keywords = [''];
      } else if (invalidCase === 'keyword contains spaces') {
        metadata.keywords = ['H2 O'];
      } else if (invalidCase === 'keyword not in content') {
        metadata.keywords = ['XYZ'];
      }
      break;

    case 'matching':
      if (invalidCase === 'missing pairs') {
        delete metadata.pairs;
      } else if (invalidCase === 'pairs not array') {
        metadata.pairs = 'not array';
      } else if (invalidCase === 'less than 2 pairs') {
        metadata.pairs = [{ id: 1, left: 'a', right: 'b' }];
      } else if (invalidCase === 'pair missing id') {
        metadata.pairs = [
          { left: 'a', right: 'b' },
          { id: 2, left: 'c', right: 'd' }
        ];
      } else if (invalidCase === 'pair id not integer') {
        metadata.pairs = [
          { id: 'one', left: 'a', right: 'b' },
          { id: 2, left: 'c', right: 'd' }
        ];
      } else if (invalidCase === 'duplicate pair id') {
        metadata.pairs = [
          { id: 1, left: 'a', right: 'b' },
          { id: 1, left: 'c', right: 'd' }
        ];
      } else if (invalidCase === 'pair missing left') {
        metadata.pairs = [
          { id: 1, right: 'b' },
          { id: 2, left: 'c', right: 'd' }
        ];
      } else if (invalidCase === 'pair missing right') {
        metadata.pairs = [
          { id: 1, left: 'a' },
          { id: 2, left: 'c', right: 'd' }
        ];
      } else if (invalidCase === 'pair left empty') {
        metadata.pairs = [
          { id: 1, left: '', right: 'b' },
          { id: 2, left: 'c', right: 'd' }
        ];
      } else if (invalidCase === 'pair right empty') {
        metadata.pairs = [
          { id: 1, left: 'a', right: '' },
          { id: 2, left: 'c', right: 'd' }
        ];
      }
      break;

    case 'ordering':
      if (invalidCase === 'missing items') {
        delete metadata.items;
      } else if (invalidCase === 'items not array') {
        metadata.items = 'not array';
      } else if (invalidCase === 'less than 3 items') {
        metadata.items = [
          { order_id: 1, text: 'one' },
          { order_id: 2, text: 'two' }
        ];
      } else if (invalidCase === 'item missing order_id') {
        metadata.items = [
          { text: 'one' },
          { order_id: 2, text: 'two' },
          { order_id: 3, text: 'three' }
        ];
      } else if (invalidCase === 'order_id not integer') {
        metadata.items = [
          { order_id: 'one', text: 'one' },
          { order_id: 2, text: 'two' },
          { order_id: 3, text: 'three' }
        ];
      } else if (invalidCase === 'order_id out of range (too high)') {
        metadata.items = [
          { order_id: 5, text: 'one' },
          { order_id: 2, text: 'two' },
          { order_id: 3, text: 'three' }
        ];
      } else if (invalidCase === 'order_id out of range (too low)') {
        metadata.items = [
          { order_id: 0, text: 'one' },
          { order_id: 2, text: 'two' },
          { order_id: 3, text: 'three' }
        ];
      } else if (invalidCase === 'duplicate order_id') {
        metadata.items = [
          { order_id: 1, text: 'one' },
          { order_id: 1, text: 'two' },
          { order_id: 3, text: 'three' }
        ];
      } else if (invalidCase === 'non-consecutive order_id') {
        metadata.items = [
          { order_id: 1, text: 'one' },
          { order_id: 3, text: 'two' },
          { order_id: 4, text: 'three' }
        ];
      } else if (invalidCase === 'item missing text') {
        metadata.items = [
          { order_id: 1 },
          { order_id: 2, text: 'two' },
          { order_id: 3, text: 'three' }
        ];
      } else if (invalidCase === 'item empty text') {
        metadata.items = [
          { order_id: 1, text: '' },
          { order_id: 2, text: 'two' },
          { order_id: 3, text: 'three' }
        ];
      }
      break;
  }

  invalidData.metadataJson = JSON.stringify(metadata);
  return invalidData;
}

module.exports = {
  API_BASE_URL,
  adminUser,
  generateQuestion,
  generateInvalidQuestion
};