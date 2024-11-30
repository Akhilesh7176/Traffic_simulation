if [ $# -eq 0 ]; then
    echo "Usage: $0 [Please enter any parameter for vehicle simulation]"
    exit 1
fi

echo "Data Generating through sim_visual with arguments: $@"
python3 ./src/data_generator/sim_visual.py "$@"

if [ $? -eq 0 ]; then
    echo "Data is generated. Starting the server..."    
    npm run dev
else
    echo "Failed in Data generation."
    exit 1
fi
