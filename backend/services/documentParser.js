import pdf from 'pdf-parse';
import mammoth from 'mammoth';

/**
 * Extracts plain text from document buffers based on mimetype.
 * @param {Buffer} buffer - File buffer
 * @param {string} mimetype - File mimetype
 * @returns {Promise<string>} - Extracted text
 */
export async function extractTextFromBuffer(buffer, mimetype) {
  if (mimetype === 'application/pdf') {
    const data = await pdf(buffer);
    return data.text;
  } else if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimetype === 'application/msword'
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } else if (mimetype.startsWith('text/') || mimetype === 'application/json') {
    return buffer.toString('utf-8');
  } else {
    throw new Error(`Unsupported document type: ${mimetype}`);
  }
}
