class TopXTupleList {
    constructor(N, I) {
        this.N = N; // Maximum size of the array
        this.TupleIndex = I; // Index of the tuple to sort on
        this.list = []; // Internal array to store the tuples
        this.lowestValue = null; // Track the lowest value in the array
    }

    insert(tuple) { // returns true if item has been added to array, false otherwise.
        const value = tuple[this.TupleIndex];

        if (this.list.length < this.N) {
            this.list.push(tuple);
            if (this.lowestValue === null || value < this.lowestValue) {
                this.lowestValue = value;
            }
            return true;
        } else {
            if (value > this.lowestValue) {
                // Find and remove the element with the lowest value
                for (let i = 0; i < this.list.length; i++) {
                    if (this.list[i][this.TupleIndex] === this.lowestValue) {
                        this.list.splice(i, 1);
                        break;
                    }
                }
                this.list.push(tuple);
                this.lowestValue = this.list.reduce((min, tuple) => Math.min(min, tuple[this.TupleIndex]), Infinity);
                return true;
            }
        }
        return false;
    }

    getSortedArray() {
        // Return a sorted copy of the list
        return this.list.slice().toSorted((a, b) => b[this.TupleIndex] - a[this.TupleIndex]);
    }

    clear() {
        this.list = [];
        this.lowestValue = null;
    }
}

export default TopXTupleList;
