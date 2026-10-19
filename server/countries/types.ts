export interface ServerCountryConfig {
	/** Order matters. Must equal the client's `boxFields` for the same country (tested). */
	boxFields: Record<string, { required: boolean }>;
	/** Box fields exported as columns of the delivery report, in order. */
	reportFields: string[];
	/** Box field `/boxes/coords` uses to match boxes when updating GPS coordinates. */
	gpsMatchField: string;
	features: {
		/** Daily email report (Rwanda). */
		dailyReport: boolean;
	};
}
