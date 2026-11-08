import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { ChatbotToolDefinition } from '../../../../integrations/chatbot/chatbot.tools';

const tool = (
  name: string,
  description: string,
  properties: Record<string, unknown>,
): ChatbotToolDefinition => ({
  type: 'function',
  function: {
    name,
    description,
    strict: true,
    parameters: {
      type: 'object',
      properties,
      required: Object.keys(properties),
      additionalProperties: false,
    },
  },
});
const nullableText = { type: ['string', 'null'] };
export const supportTools: ChatbotToolDefinition[] = [
  tool(
    'lookup_booking',
    "Read this authenticated customer's own booking/ticket/payment status. The backend verifies session and ownership. Never request customerId, token or phone as tool arguments. A booking or ticket code alone does not authorize access.",
    {
      code: {
        type: 'string',
        description: 'Order or ticket code provided by the customer.',
      },
    },
  ),
  tool(
    'search_knowledge',
    'Retrieve published website FAQ knowledge for general guidance, account help, payment instructions or service information. Choose a few specific Vietnamese keywords; accents are optional. This returns source documents to synthesize, not a canned answer. Use search_policies to verify formal policy rules and search_trips for live availability.',
    {
      query: {
        type: 'string',
        description: 'Specific topic keywords for the customer question.',
      },
      category: {
        type: ['string', 'null'],
        enum: [
          'booking',
          'payment',
          'refund',
          'info',
          'member',
          'support',
          null,
        ],
      },
    },
  ),
  tool(
    'search_trips',
    'Read live trips, departure times, fares and available seats from VIAGO database. Ask for missing from/to/date first. Preserve known fields when customer changes only one. Use TP.HCM for Saigon/HCM. All dates/times use Vietnam timezone. At most 3 matching trips are returned.',
    {
      from: {
        type: 'string',
        description: 'Departure city confirmed by the customer.',
      },
      to: {
        type: 'string',
        description: 'Destination city confirmed by the customer.',
      },
      date: {
        type: 'string',
        description:
          'Confirmed departure date YYYY-MM-DD; resolve relative dates using todayVietnam.',
      },
      count: {
        type: 'integer',
        minimum: 1,
        maximum: 5,
        description: 'Number of tickets, default 1 unless customer specifies.',
      },
      time: {
        type: 'string',
        enum: ['all', 'morning', 'afternoon', 'evening', 'night'],
      },
      sort: { type: 'string', enum: ['early', 'late', 'price'] },
      type: {
        type: ['string', 'null'],
        enum: ['Limousine9Cho', 'Cabin22Cho', 'GiuongNam34Cho', null],
      },
    },
  ),
  tool(
    'search_routes',
    'Find active routes/cities from VIAGO database. Route base fare is indicative, not live trip availability. query=null lists some routes; otherwise use a city or route keyword.',
    { query: nullableText },
  ),
  tool(
    'search_policies',
    'Read currently effective VIAGO policies. Use category and optionally a short keyword; query=null retrieves policies in that category. General policy questions do not require staff handoff.',
    {
      category: {
        type: 'string',
        enum: ['DatVe', 'ChinhSuaVe', 'HoanHuy', 'DieuKhoanDichVu', 'BaoMat'],
      },
      query: nullableText,
    },
  ),
  tool(
    'get_company_info',
    'Get configured official VIAGO hotline, email and address. Null means unavailable; do not invent contact information.',
    {},
  ),
];

export class RouteLookupDto {
  @IsOptional() @IsString() @MaxLength(150) query?: string | null;
}
export class KnowledgeLookupDto {
  @IsString() @MinLength(2) @MaxLength(150) query: string;
  @IsOptional()
  @IsIn(['booking', 'payment', 'refund', 'info', 'member', 'support'])
  category?: string | null;
}
export class PolicyLookupDto extends RouteLookupDto {
  @IsIn(['DatVe', 'ChinhSuaVe', 'HoanHuy', 'DieuKhoanDichVu', 'BaoMat'])
  category: 'DatVe' | 'ChinhSuaVe' | 'HoanHuy' | 'DieuKhoanDichVu' | 'BaoMat';
}
